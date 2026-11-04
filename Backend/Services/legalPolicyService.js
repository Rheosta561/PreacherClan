const { readFileSync } = require('node:fs');
const path = require('node:path');

const POLICIES = {
  terms: {
    version: '2026-11-04',
    title: 'Terms and Conditions',
    filename: 'TERMS_AND_CONDITIONS.md',
  },
  privacy: {
    version: '2026-11-04',
    title: 'Privacy Policy',
    filename: 'PRIVACY_POLICY.md',
  },
};

const getPolicyVersions = () => ({
  termsVersion: POLICIES.terms.version,
  privacyPolicyVersion: POLICIES.privacy.version,
});

const getPolicyDocument = (name) => {
  const policy = POLICIES[name];
  if (!policy) return null;
  const filename = path.join(__dirname, '..', 'docs', 'legal', policy.filename);
  return { version: policy.version, title: policy.title, content: readFileSync(filename, 'utf8') };
};

module.exports = { getPolicyDocument, getPolicyVersions };
