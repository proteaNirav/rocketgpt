module.exports = function plan(spec) {
  const component = "LicenseManager.Admin";
  return {
    component,
    changes: [
      { type: "add", path: `${component}/Pages/Activate.cshtml`, reason: "Activation UI" },
      { type: "add", path: `${component}/Services/OtpService.cs`, reason: "OTP & TTL" },
      { type: "add", path: `${component}/Services/CaptchaVerifier.cs`, reason: "CAPTCHA verify" },
      { type: "add", path: `${component}/Services/ActivationTokenService.cs`, reason: "One-time token" }
    ],
    tests: [
      `${component}.Tests/OtpServiceTests.cs`,
      `${component}.Tests/ActivationFlowTests.cs`
    ],
    docs: [
      "docs/activation_flow.md",
      "README.md"
    ]
  };
};
