const path = require('path');
const controllerModule = require(path.resolve(process.cwd(), 'backend/src/controllers/domainController'));
const getDomainProfileController = controllerModule.getDomainProfileController;

module.exports = async function handler(req, res) {
  console.log('[Domain API] request body', req.body);

  if (req.method && !['POST', 'GET'].includes(req.method.toUpperCase())) {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return getDomainProfileController(req, res);
};
