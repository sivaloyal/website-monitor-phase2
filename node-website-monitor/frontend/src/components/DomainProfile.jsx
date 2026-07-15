import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Globe, ShieldCheck, CalendarClock, Search, CheckCircle2, AlertCircle, LoaderCircle, Server, ShieldAlert, BarChart3, Radar } from 'lucide-react';

const API_BASE = '/api';

const formatDate = (value) => {
  if (!value) return 'Not available';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (error) {
    return value;
  }
};

export default function DomainProfile({ defaultDomain = 'wordpress.org' }) {
  const [domain, setDomain] = useState(defaultDomain);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = async (targetDomain = domain) => {
    if (!targetDomain) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/domain/profile`, { domain: targetDomain });
      setProfile(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load domain profile.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile(defaultDomain);
  }, [defaultDomain]);

  const summaryCards = useMemo(() => {
    if (!profile) return [];

    return [
      { label: 'Registrar', value: profile.registrar || 'Unknown', icon: ShieldCheck },
      { label: 'Created Date', value: formatDate(profile.createdDate), icon: CalendarClock },
      { label: 'Expiry Date', value: formatDate(profile.expiryDate), icon: CalendarClock },
      { label: 'Domain Age', value: profile.domainAge || 'Unknown', icon: Globe }
    ];
  }, [profile]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Globe className="w-40 h-40 text-indigo-500" />
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">DOMAIN MONITORING</span>
        <h2 className="text-xl font-extrabold text-slate-200 tracking-tight">Domain Profile</h2>
        <p className="text-xs text-slate-500 mt-1">Inspect registrar records, WHOIS changes, DNS validation, and reputation signals from one place.</p>
      </div>

      <div className="glass-card p-5 rounded-2xl">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="Enter a domain name"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/70 text-sm text-slate-200 outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => loadProfile(domain)}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-all disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Checking...' : 'Check Profile'}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {profile && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="glass-card p-4 rounded-2xl border border-slate-800/60">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <Icon className="h-3.5 w-3.5 text-indigo-400" />
                    {card.label}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-200">{card.value}</div>
                </div>
              );
            })}
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Domain</div>
                <div className="text-lg font-extrabold text-slate-200">{profile.domain}</div>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${profile.accessibility?.isAccessible ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {profile.accessibility?.isAccessible ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {profile.accessibility?.isAccessible ? 'Accessible' : 'Not Accessible'}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Accessibility</div>
                <div className="mt-2 text-sm text-slate-300">{profile.accessibility?.message || 'No accessibility data available.'}</div>
                <div className="mt-2 text-xs text-slate-500">HTTP Status: {profile.accessibility?.statusCode ?? 'n/a'}</div>
              </div>
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">WHOIS Overview</div>
                <div className="mt-2 text-sm text-slate-300">{profile.whoisMonitoring?.changeDetection?.message || 'WHOIS data available.'}</div>
                <div className="mt-2 text-xs text-slate-500">{profile.whoisMonitoring?.ownershipChanges?.message || 'No ownership change signal found.'}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="glass-card p-5 rounded-2xl border border-slate-800/60">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-200">WHOIS Monitoring</h3>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Change Detection</div>
                  <div className="mt-1">{profile.whoisMonitoring?.changeDetection?.message}</div>
                </div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Ownership Changes</div>
                  <div className="mt-1">{profile.whoisMonitoring?.ownershipChanges?.message}</div>
                </div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Expiration Alert</div>
                  <div className="mt-1">{profile.whoisMonitoring?.expirationAlert?.message}</div>
                </div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Renewal Reminder</div>
                  <div className="mt-1">{profile.whoisMonitoring?.renewalReminder?.message}</div>
                </div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Transfer Detection</div>
                  <div className="mt-1">{profile.whoisMonitoring?.transferDetection?.message}</div>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800/60">
              <div className="flex items-center gap-2 mb-4">
                <Server className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-200">DNS Monitoring</h3>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Records</div>
                  <div className="mt-1">A: {profile.dnsMonitoring?.records?.a?.length || 0} • AAAA: {profile.dnsMonitoring?.records?.aaaa?.length || 0} • MX: {profile.dnsMonitoring?.records?.mx?.length || 0} • TXT: {profile.dnsMonitoring?.records?.txt?.length || 0} • CNAME: {profile.dnsMonitoring?.records?.cname?.length || 0}</div>
                </div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">SPF / DKIM / DMARC</div>
                  <div className="mt-1">SPF: {profile.dnsMonitoring?.validation?.spf?.valid ? 'Present' : 'Missing'} • DKIM: {profile.dnsMonitoring?.validation?.dkim?.valid ? 'Present' : 'Missing'} • DMARC: {profile.dnsMonitoring?.validation?.dmarc?.valid ? 'Present' : 'Missing'}</div>
                </div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">DNSSEC / Propagation</div>
                  <div className="mt-1">{profile.dnsMonitoring?.validation?.dnssec?.message} • {profile.dnsMonitoring?.validation?.propagation?.message}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800/60">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-200">Reputation Signals</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Trust Score</div>
                <div className="mt-2 text-2xl font-black text-slate-200">{profile.reputation?.trustScore ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Blacklist</div>
                <div className="mt-2 text-sm text-slate-300">{profile.reputation?.blacklist?.listed ? 'Listed' : 'Not listed'}</div>
              </div>
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Spam / Search</div>
                <div className="mt-2 text-sm text-slate-300">{profile.reputation?.spamReputation} • {profile.reputation?.searchReputation}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
