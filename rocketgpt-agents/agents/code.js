const { w } = require('../shared/utils');
const { repoContext } = require('../shared/repo_reader');

module.exports = async function code(spec) {
  const ctx = repoContext();
  const component = ctx.projects.admin || 'LicenseManager.Admin';
  const title = spec.title || 'Activation Flow';

  // Razor Page (simple starter)
  w(`${component}/Pages/Activate.cshtml`,
`@page
@model ActivateModel
@{
    ViewData["Title"] = "Activate License";
}
<h2>Activate License</h2>
<form method="post">
  <label>Registered Email</label>
  <input asp-for="Email" />
  <label>OTP</label>
  <input asp-for="Otp" />
  <input type="hidden" asp-for="CaptchaToken" />
  <button type="submit">Activate</button>
</form>
<p>Spec: ${title}</p>
`);

  // Razor Page Model
  w(`${component}/Pages/Activate.cshtml.cs`,
`using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ${component}.Services;

namespace ${component}.Pages
{
    public class ActivateModel : PageModel
    {
        private readonly OtpService _otp;
        private readonly CaptchaVerifier _captcha;
        private readonly ActivationTokenService _tokens;

        [BindProperty] public string Email { get; set; } = string.Empty;
        [BindProperty] public string Otp { get; set; } = string.Empty;
        [BindProperty] public string CaptchaToken { get; set; } = string.Empty;

        public ActivateModel(OtpService otp, CaptchaVerifier captcha, ActivationTokenService tokens)
        {
            _otp = otp; _captcha = captcha; _tokens = tokens;
        }

        public void OnGet() {}

        public IActionResult OnPost()
        {
            if(!_captcha.Verify(CaptchaToken)) { ModelState.AddModelError("", "CAPTCHA failed."); return Page(); }
            if(!_otp.Validate(Email, Otp)) { ModelState.AddModelError("", "Invalid/expired OTP."); return Page(); }
            var ***REMOVED***
            // TODO: redirect to activation endpoint with encrypted token
            TempData["msg"] = "Activation token issued.";
            return RedirectToPage("/Index");
        }
    }
}
`);

  // Services
  w(`${component}/Services/OtpService.cs`,
`using System;
using System.Collections.Concurrent;

namespace ${component}.Services
{
    public class OtpService
    {
        private static ConcurrentDictionary<string,(string code, DateTime expires)> store = new();

        public string Issue(string email, TimeSpan ttl)
        {
            var code = new Random().Next(100000,999999).ToString();
            store[email] = (code, DateTime.UtcNow.Add(ttl));
            // TODO: send via SMTP configured settings
            return code;
        }

        public bool Validate(string email, string code)
        {
            if(!store.TryGetValue(email, out var v)) return false;
            if(v.expires < DateTime.UtcNow) return false;
            return v.code == code;
        }
    }
}
`);

  w(`${component}/Services/CaptchaVerifier.cs`,
`namespace ${component}.Services
{
    public class CaptchaVerifier
    {
        public bool Verify(string token)
        {
            // TODO: call server-side CAPTCHA verification (e.g., hCaptcha/Recaptcha)
            return !string.IsNullOrWhiteSpace(token);
        }
    }
}
`);

  w(`${component}/Services/ActivationTokenService.cs`,
`using System;
using System.Security.Cryptography;
using System.Text;

namespace ${component}.Services
{
    public class ActivationTokenService
    {
        public string IssueOneTimeToken(string email)
        {
            // TODO: store nonce/consume-once semantics in DB
            var payload = email + "|" + DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            return Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(payload))).Substring(0, 32);
        }
    }
}
`);

  // Minimal DI registration helper (if not already present)
  w(`${component}/Extensions/ServiceCollectionExtensions.cs`,
`using Microsoft.Extensions.DependencyInjection;
using ${component}.Services;

namespace ${component}.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddActivationFlow(this IServiceCollection services)
        {
            services.AddSingleton<OtpService>();
            services.AddSingleton<CaptchaVerifier>();
            services.AddSingleton<ActivationTokenService>();
            return services;
        }
    }
}
`);
};
