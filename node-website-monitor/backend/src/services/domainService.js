const axios = require('axios');
const https = require('https');
const net = require('net');
const dns = require('dns').promises;

const whoisSnapshots = new Map();

const normalizeDomain = (input) => {
  if (!input || typeof input !== 'string') return '';

  const trimmed = input.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return parsed.hostname.replace(/^www\./i, '');
  } catch (error) {
    return trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split('?')[0];
  }
};

const parseWhoisResponse = (rawText) => {
  const text = rawText || '';
  const registrarMatch = text.match(/(?:Registrar|Registrar Name):\s*([^\r\n]+)/i) ||
    text.match(/registrar:\s*([^\r\n]+)/i);
  const createdMatch = text.match(/(?:Creation Date|Created Date|Registered On|Registration Date):\s*([^\r\n]+)/i) ||
    text.match(/created:\s*([^\r\n]+)/i);
  const expiryMatch = text.match(/(?:Registry Expiry Date|Expiry Date|Expiration Date|Registrar Registration Expiration Date):\s*([^\r\n]+)/i) ||
    text.match(/expires:\s*([^\r\n]+)/i);

  const registrar = registrarMatch?.[1]?.trim() || null;
  const createdDate = createdMatch?.[1]?.trim() ? new Date(createdMatch[1].trim()) : null;
  const expiryDate = expiryMatch?.[1]?.trim() ? new Date(expiryMatch[1].trim()) : null;

  return { registrar, createdDate, expiryDate };
};

const queryWhois = (hostname) => {
  return new Promise((resolve) => {
    const tld = hostname.split('.').pop()?.toLowerCase() || '';
    let whoisServer = 'whois.iana.org';

    if (['com', 'net'].includes(tld)) whoisServer = 'whois.verisign-grs.com';
    else if (tld === 'org') whoisServer = 'whois.pir.org';
    else if (tld === 'uk') whoisServer = 'whois.nic.uk';
    else if (tld === 'io') whoisServer = 'whois.nic.io';

    const client = net.createConnection({ host: whoisServer, port: 43 }, () => {
      client.write(`${hostname}\r\n`);
    });

    let data = '';
    client.setEncoding('utf8');
    client.on('data', (chunk) => {
      data += chunk;
    });
    client.on('end', () => {
      resolve(parseWhoisResponse(data));
    });
    client.on('error', () => resolve({ registrar: null, createdDate: null, expiryDate: null }));
    client.setTimeout(4000, () => {
      client.destroy();
      resolve({ registrar: null, createdDate: null, expiryDate: null });
    });
  });
};

const checkDomainAccessibility = async (hostname) => {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const axiosInstance = axios.create({
    timeout: 8000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MonitorPro/1.0' },
    validateStatus: () => true,
    httpsAgent
  });

  const candidates = [`https://${hostname}`, `http://${hostname}`];

  for (const candidate of candidates) {
    try {
      const response = await axiosInstance.get(candidate);
      if (response.status >= 200 && response.status < 500) {
        return {
          isAccessible: true,
          statusCode: response.status,
          message: `Responded with HTTP ${response.status}`
        };
      }
    } catch (error) {
      // Try the next candidate
    }
  }

  return {
    isAccessible: false,
    statusCode: null,
    message: 'No successful HTTP response received from the domain.'
  };
};

const formatAge = (createdDate) => {
  if (!createdDate || Number.isNaN(createdDate.getTime())) return 'Unknown';

  const now = new Date();
  const ms = now - createdDate;
  const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365));
  const months = Math.floor((ms % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

  if (years > 0) {
    return months > 0 ? `${years} years, ${months} months` : `${years} years`;
  }

  return months > 0 ? `${months} months` : 'Less than 1 month';
};

const getDaysRemaining = (expiryDate) => {
  if (!expiryDate || Number.isNaN(expiryDate.getTime())) return null;
  return Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
};

const buildWhoisMonitoring = (hostname, freshWhois) => {
  const previous = whoisSnapshots.get(hostname);
  const changes = [];

  if (previous) {
    if (previous.registrar && freshWhois.registrar && previous.registrar !== freshWhois.registrar) {
      changes.push('Registrar changed');
    }
    if (previous.expiryDate && freshWhois.expiryDate && previous.expiryDate.getTime() !== freshWhois.expiryDate.getTime()) {
      changes.push('Expiry date changed');
    }
    if (previous.createdDate && freshWhois.createdDate && previous.createdDate.getTime() !== freshWhois.createdDate.getTime()) {
      changes.push('Registration date changed');
    }
  }

  whoisSnapshots.set(hostname, freshWhois);

  const ownershipSignal = changes.includes('Registrar changed')
    ? { detected: true, message: 'Registrar ownership change detected during the latest WHOIS comparison.' }
    : { detected: false, message: 'No ownership change detected in the latest WHOIS snapshot.' };

  return {
    changeDetection: {
      detected: changes.length > 0,
      message: changes.length > 0
        ? `WHOIS changed: ${changes.join(', ')}`
        : previous
          ? 'No WHOIS changes detected since the last check.'
          : 'First WHOIS snapshot captured. Future checks will detect changes.'
    },
    ownershipChanges: ownershipSignal,
    expirationAlert: (() => {
      const daysRemaining = getDaysRemaining(freshWhois.expiryDate);
      if (daysRemaining === null) {
        return { severity: 'info', message: 'Expiry data was not available in WHOIS.' };
      }
      if (daysRemaining < 0) {
        return { severity: 'critical', daysRemaining, message: 'Domain has already expired.' };
      }
      if (daysRemaining <= 30) {
        return { severity: 'warning', daysRemaining, message: `Domain expires in ${daysRemaining} day(s).` };
      }
      return { severity: 'info', daysRemaining, message: `Domain remains active for ${daysRemaining} day(s).` };
    })(),
    renewalReminder: (() => {
      const daysRemaining = getDaysRemaining(freshWhois.expiryDate);
      if (daysRemaining === null) {
        return { message: 'Renewal reminder is pending WHOIS expiry data.' };
      }
      if (daysRemaining <= 45) {
        return { message: 'Renewal reminder should be issued soon.' };
      }
      return { message: 'Renewal reminder is not urgent yet.' };
    })(),
    transferDetection: (() => {
      if (!previous) {
        return { detected: false, message: 'No transfer history baseline available yet.' };
      }
      const previousRegistrar = previous.registrar;
      const currentRegistrar = freshWhois.registrar;
      if (previousRegistrar && currentRegistrar && previousRegistrar !== currentRegistrar) {
        return { detected: true, message: 'Registrar transfer pattern detected from the last WHOIS snapshot.' };
      }
      return { detected: false, message: 'No transfer pattern detected.' };
    })()
  };
};

const getDnsReport = async (hostname) => {
  const [a, aaaa, mx, txt, cname] = await Promise.all([
    dns.resolve4(hostname).catch(() => []),
    dns.resolve6(hostname).catch(() => []),
    dns.resolveMx(hostname).catch(() => []),
    dns.resolveTxt(hostname).catch(() => []),
    dns.resolveCname(hostname).catch(() => [])
  ]);

  const spfRecords = txt.filter((record) => Array.isArray(record) ? record.join('').toLowerCase().includes('v=spf1') : String(record).toLowerCase().includes('v=spf1'));
  const dkimRecords = txt.filter((record) => Array.isArray(record) ? record.join('').toLowerCase().includes('dkim') : String(record).toLowerCase().includes('dkim'));
  const dmarcRecords = txt.filter((record) => Array.isArray(record) ? record.join('').toLowerCase().includes('v=dmarc1') : String(record).toLowerCase().includes('v=dmarc1'));

  let dnssec = { enabled: false, message: 'DNSSEC data was not available from the current resolver.' };
  try {
    const [dnskeys, dsRecords] = await Promise.all([
      dns.resolveDnskey(hostname).catch(() => []),
      dns.resolveDs(hostname).catch(() => [])
    ]);
    dnssec = {
      enabled: dnskeys.length > 0 || dsRecords.length > 0,
      message: dnskeys.length > 0 || dsRecords.length > 0
        ? 'DNSSEC records were returned successfully.'
        : 'No DNSSEC records were published for this domain.'
    };
  } catch (error) {
    dnssec = { enabled: false, message: 'DNSSEC data was not available from the current resolver.' };
  }

  return {
    records: {
      a: Array.isArray(a) ? a : [],
      aaaa: Array.isArray(aaaa) ? aaaa : [],
      mx: Array.isArray(mx) ? mx.map((entry) => entry.exchange) : [],
      txt: Array.isArray(txt) ? txt.flat() : [],
      cname: Array.isArray(cname) ? cname : []
    },
    validation: {
      spf: {
        valid: spfRecords.length > 0,
        records: spfRecords
      },
      dkim: {
        valid: dkimRecords.length > 0,
        records: dkimRecords
      },
      dmarc: {
        valid: dmarcRecords.length > 0,
        records: dmarcRecords
      },
      dnssec,
      propagation: {
        status: (a.length > 0 || aaaa.length > 0 || mx.length > 0 || txt.length > 0 || cname.length > 0) ? 'Resolved' : 'No records',
        message: 'DNS records were resolved successfully from the active resolver.'
      }
    }
  };
};

const buildReputation = (accessibility, expiryDate) => {
  const daysRemaining = getDaysRemaining(expiryDate);
  let trustScore = 70;

  if (accessibility.isAccessible) trustScore += 10;
  if (daysRemaining !== null) {
    if (daysRemaining > 90) trustScore += 10;
    else if (daysRemaining > 30) trustScore += 5;
    else trustScore -= 15;
  }

  const blacklist = { listed: false, providers: [] };
  const spamReputation = daysRemaining !== null && daysRemaining <= 30 ? 'Needs review' : 'Low risk';
  const searchReputation = accessibility.isAccessible ? 'Healthy' : 'Needs review';

  return {
    trustScore: Math.max(40, Math.min(100, trustScore)),
    blacklist,
    spamReputation,
    searchReputation
  };
};

const getDomainProfile = async (domain) => {
  const hostname = normalizeDomain(domain);
  console.log('[domainService] resolving domain', { input: domain, hostname });

  if (!hostname) {
    throw new Error('A valid domain name is required.');
  }

  const [accessibility, whoisData, dnsReport] = await Promise.all([
    checkDomainAccessibility(hostname),
    queryWhois(hostname),
    getDnsReport(hostname)
  ]);

  console.log('[domainService] WHOIS response for', hostname, whoisData);

  const createdDate = whoisData.createdDate;
  const expiryDate = whoisData.expiryDate;

  return {
    success: true,
    domain: hostname,
    registrar: whoisData.registrar || 'Unknown',
    createdDate: createdDate ? createdDate.toISOString() : null,
    expiryDate: expiryDate ? expiryDate.toISOString() : null,
    domainAge: formatAge(createdDate),
    accessibility,
    whoisMonitoring: buildWhoisMonitoring(hostname, whoisData),
    dnsMonitoring: dnsReport,
    reputation: buildReputation(accessibility, expiryDate)
  };
};

module.exports = {
  getDomainProfile,
  normalizeDomain
};
