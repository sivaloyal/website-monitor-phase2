export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const url = typeof req.body?.url === 'string' ? req.body.url : 'https://wordpress.org';

  res.status(200).json({
    success: true,
    stats: {
      url,
      totalChecks: 1,
      uptimePercentage: 100,
      latestStatus: {
        isUp: true,
        statusCode: 200,
        loadTimeMs: 180,
        ttfbMs: 80,
        checkedAt: new Date().toISOString(),
        seo: { seoScore: 86 },
        performance: { performanceScore: 84 },
        security: { securityScore: 90 },
        ssl: { valid: true, daysRemaining: 45 },
        pageAnalysis: { pageCount: { estimatedPages: 5 }, siteWideImages: { totalImages: 12, withAlt: 10 } },
        malware: { status: 'clean', findings: [] }
      },
      historyLog: []
    }
  });
}
