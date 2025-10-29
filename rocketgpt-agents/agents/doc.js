const { w } = require('../shared/utils');
module.exports = async function doc(spec) {
  const a = spec.acceptance || [];
  w(`docs/activation_flow.md`,
`# Activation Flow

**Title:** ${spec.title||'N/A'}

## Acceptance
${a.map((x,i)=>`${i+1}. ${x}`).join('\n')}

## Notes
- OTP TTL default 5 minutes.
- CAPTCHA verified server-side.
- One-time activation token issued and logged.
`);
  // Update or create README section
  w(`README.md`,
`# Project

## AI Codegen (M1.8)
Generated scaffolds for activation flow.
See \`docs/activation_flow.md\`.
`);
};
