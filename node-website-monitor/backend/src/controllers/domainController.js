const { getDomainProfile } = require('../services/domainService');

const getDomainProfileController = async (req, res) => {
  const { domain } = req.body;
  console.log('[domainController] received domain', domain);

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required.' });
  }

  try {
    const profile = await getDomainProfile(domain);
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to load domain profile.' });
  }
};

module.exports = {
  getDomainProfileController
};
