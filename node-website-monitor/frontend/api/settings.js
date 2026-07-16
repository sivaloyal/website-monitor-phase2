export default async function handler(req, res) {
  if (req.method === 'POST') {
    res.status(200).json({ success: true });
    return;
  }

  res.status(200).json({
    settings: {
      slack_webhook: '',
      telegram_chat_id: '',
      critical_email: '',
      email_host_user: '',
      email_host_password: '',
      alert_email_recipients: '',
      alerts_enabled: true,
      resend_api_key: '',
      resend_from_email: ''
    },
    emailLogs: [],
    totalLogsCount: 0
  });
}
