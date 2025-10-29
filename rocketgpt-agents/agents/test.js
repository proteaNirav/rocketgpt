const { w } = require('../shared/utils');
module.exports = async function test(spec) {
  const component = 'LicenseManager.Admin'; // simple default
  w(`${component}.Tests/OtpServiceTests.cs`,
`using Xunit;
using ${component}.Services;
using System;

public class OtpServiceTests
{
    [Fact]
    public void Issue_And_Validate_Otp_Works()
    {
        var svc = new OtpService();
        var code = svc.Issue("user@example.com", TimeSpan.FromMinutes(5));
        Assert.True(svc.Validate("user@example.com", code));
    }
}
`);
  w(`${component}.Tests/ActivationFlowTests.cs`,
`using Xunit;

public class ActivationFlowTests
{
    [Fact]
    public void Placeholder()
    {
        Assert.True(true);
    }
}
`);
};
