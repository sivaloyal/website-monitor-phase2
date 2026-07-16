export default async function handler(req, res) {
  if (req.method === 'POST') {
    res.status(200).json({ success: true });
    return;
  }

  res.status(200).json({ success: true });
}
