const express = require('express');
const { getPolicyDocument, getPolicyVersions } = require('../Services/legalPolicyService');

const router = express.Router();

router.get('/versions', (req, res) => res.json(getPolicyVersions()));

router.get('/:policy', (req, res) => {
  const document = getPolicyDocument(req.params.policy);
  if (!document) return res.status(404).json({ message: 'Policy document not found' });
  res.set('Cache-Control', 'public, max-age=300');
  return res.json(document);
});

module.exports = router;
