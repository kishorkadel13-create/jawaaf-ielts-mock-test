# Supabase Auth Email Setup

Use Supabase Auth for email verification and password recovery. Do not store SMTP credentials in the frontend or backend source code.

## URL Configuration

In Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `http://localhost:5173` for development, your production `VITE_APP_URL` for production.
- Redirect URLs:
  - `http://localhost:5173/login?verified=1`
  - `http://localhost:5173/reset-password`
  - `${VITE_APP_URL}/login?verified=1`
  - `${VITE_APP_URL}/reset-password`

In Vercel/project environment variables:

- `VITE_APP_URL=https://your-production-domain.com`

## Email Provider

In Supabase Dashboard -> Authentication -> Providers -> Email:

- Enable Email provider.
- Enable Confirm email. This is required; if it is off, Supabase will create an immediate login session and students can log in without verification.
- Use email/password signup and login.

## Custom SMTP

In Supabase Dashboard -> Authentication -> SMTP Settings, configure your provider:

- SMTP host
- SMTP port
- SMTP username
- SMTP password
- Sender email: `no-reply@OUR_DOMAIN`
- Sender name: `Jawaaf IELTS Lab`

Use a normal SMTP provider such as Resend, Amazon SES, Brevo, Postmark, or another trusted transactional email provider. Keep credentials only inside Supabase Dashboard/provider secrets.

## Confirm Signup Template

Subject:

```text
Verify your Jawaaf IELTS Lab email
```

HTML:

```html
<div style="margin:0;padding:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fa;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              <div style="font-size:22px;font-weight:800;color:#1E3A6E;line-height:1.2;">Jawaaf IELTS Lab</div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">Jawaaf Education</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 8px 32px;">
              <h1 style="margin:0;font-size:26px;line-height:1.25;color:#05162E;">Verify Your Email Address</h1>
              <p style="margin:16px 0 0 0;font-size:15px;line-height:1.65;color:#475569;">Welcome to Jawaaf IELTS Lab. Please verify your email address to activate your account and start your IELTS preparation.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px;">
              <div style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 22px;font-size:32px;line-height:1;letter-spacing:8px;font-weight:800;color:#1E3A6E;">{{ .Token }}</div>
              <p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#64748b;">Enter this code on the Jawaaf IELTS Lab verification page.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">If you did not create this account, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px;">
              <p style="margin:0;font-size:13px;color:#475569;font-weight:700;">Jawaaf Education</p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;">Your IELTS Preparation Partner</p>
              <p style="margin:12px 0 0 0;font-size:12px;color:#94a3b8;">Copyright © Jawaaf Education. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

## Reset Password Template

Subject:

```text
Reset your Jawaaf IELTS Lab password
```

HTML:

```html
<div style="margin:0;padding:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fa;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              <div style="font-size:22px;font-weight:800;color:#1E3A6E;line-height:1.2;">Jawaaf IELTS Lab</div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">Jawaaf Education</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 8px 32px;">
              <h1 style="margin:0;font-size:26px;line-height:1.25;color:#05162E;">Reset Your Password</h1>
              <p style="margin:16px 0 0 0;font-size:15px;line-height:1.65;color:#475569;">We received a request to reset your Jawaaf IELTS Lab password. Use the secure button below to choose a new password.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1E3A6E;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:10px;">Reset Password</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">If the button does not work, copy and paste this secure link into your browser:</p>
              <p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;color:#1E3A6E;word-break:break-all;">{{ .ConfirmationURL }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">If you did not request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px;">
              <p style="margin:0;font-size:13px;color:#475569;font-weight:700;">Jawaaf Education</p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;">Your IELTS Preparation Partner</p>
              <p style="margin:12px 0 0 0;font-size:12px;color:#94a3b8;">Copyright © Jawaaf Education. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```
