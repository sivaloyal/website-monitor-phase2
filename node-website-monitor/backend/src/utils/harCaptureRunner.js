const { captureWithPlaywright } = require('./harCapture');

(async () => {
  const url = process.argv[2] || process.env.TARGET_URL;
  if (!url) {
    console.error('Usage: node harCaptureRunner.js <url>');
    process.exit(2);
  }
  try {
    const result = await captureWithPlaywright(url);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('HAR capture failed:', err);
    process.exit(1);
  }
})();
