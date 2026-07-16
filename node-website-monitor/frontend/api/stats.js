export default async function handler(req, res) {
  const url = typeof req.query?.url === 'string' ? req.query.url : 'https://wordpress.org';

  res.status(200).json({
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
  });
}
