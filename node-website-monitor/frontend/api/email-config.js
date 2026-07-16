export default async function handler(req, res) {
  if (req.method === 'POST') {
    res.status(200).json({ success: true });
    return;
  }

  res.status(200).json({
    url: typeof req.query?.url === 'string' ? req.query.url : '',
    alertEmail: '',
    alertsEnabled: false,
    alertFrequency: 'instant',
    totalEmailsSent: 0,
    lastEmailSent: null,
    lastAlertType: ''
  });
}
