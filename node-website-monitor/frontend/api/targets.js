export default async function handler(req, res) {
  res.status(200).json([
    {
      url: 'https://wordpress.org',
      name: 'WordPress',
      isUp: true,
      scanCount: 3,
      isFavorite: true
    }
  ]);
}
