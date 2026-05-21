'use strict';

const { Resend } = require('resend');
const config = require('../config/env');

// Detect placeholder / missing API key so we degrade gracefully in dev
const apiKey = config.resend.apiKey;
const isResendConfigured = apiKey && apiKey.length > 10 && !apiKey.startsWith('re_...');

const resend = isResendConfigured ? new Resend(apiKey) : null;
const FROM = `${config.resend.fromName} <${config.resend.fromEmail}>`;

function warnUnconfigured(to) {
  console.warn(`[email.service] Resend is not configured — skipping email to ${to}. Set RESEND_API_KEY in .env to enable emails.`);
}

/**
 * Send a 6-digit OTP code to a user's email address for MFA verification.
 *
 * @param {string} to   - Recipient email address
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendEmailOtp(to, code) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Prani verification code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Verification Code</h2>
        <p style="color:#555;margin-bottom:24px;">Use the code below to verify your identity. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#1a1a2e;">
          ${code}
        </div>
        <p style="color:#888;font-size:13px;margin-top:24px;">If you did not request this code, please ignore this email or contact support immediately.</p>
      </div>
    `,
    text: `Your Prani verification code is: ${code}\n\nIt expires in 10 minutes. If you did not request this code, please ignore this email.`,
  });
}

/**
 * Send a team invitation email with a sign-up link.
 *
 * @param {string} to             - Recipient email address
 * @param {string} inviterName    - Name of the person sending the invite
 * @param {string} tenantName     - Name of the organisation
 * @param {string} role           - Role the invitee will receive
 * @param {string} invitationLink - Full URL to the invitation acceptance page
 * @returns {Promise<void>}
 */
async function sendInvitation(to, inviterName, tenantName, role, invitationLink) {
  if (!isResendConfigured) {
    warnUnconfigured(to);
    console.info(`[email.service] Invitation link for ${to}: ${invitationLink}`);
    return;
  }
  const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join ${tenantName} on Prani`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">You're Invited!</h2>
        <p style="color:#555;margin-bottom:16px;">
          <strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on Prani as a <strong>${roleLabel}</strong>.
        </p>
        <p style="color:#555;margin-bottom:24px;">Click the button below to accept the invitation and set up your account. The link expires in <strong>48 hours</strong>.</p>
        <a href="${invitationLink}"
           style="display:inline-block;padding:12px 28px;background:#6c63ff;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Accept Invitation
        </a>
        <p style="color:#888;font-size:13px;margin-top:28px;">
          Or copy and paste this link into your browser:<br>
          <a href="${invitationLink}" style="color:#6c63ff;word-break:break-all;">${invitationLink}</a>
        </p>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">If you did not expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
    text: `You've been invited to join ${tenantName} on Prani as ${roleLabel}.\n\n${inviterName} sent this invitation.\n\nAccept your invitation here:\n${invitationLink}\n\nThis link expires in 48 hours.`,
  });
}

/**
 * Send a welcome email after a user completes registration.
 *
 * @param {string} to   - Recipient email address
 * @param {string} name - User's display name
 * @returns {Promise<void>}
 */
async function sendWelcome(to, name) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Prani!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Welcome to Prani, ${name}!</h2>
        <p style="color:#555;margin-bottom:16px;">
          We're thrilled to have you on board. Prani helps you plan and manage events beautifully.
        </p>
        <p style="color:#555;margin-bottom:24px;">
          Get started by exploring your dashboard, creating your first event, or inviting your team.
        </p>
        <a href="${config.frontendUrl}/dashboard"
           style="display:inline-block;padding:12px 28px;background:#6c63ff;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Go to Dashboard
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">
          Need help? Reply to this email or visit our support centre.
        </p>
      </div>
    `,
    text: `Welcome to Prani, ${name}!\n\nWe're thrilled to have you on board. Visit your dashboard to get started:\n${config.frontendUrl}/dashboard`,
  });
}

/**
 * Send a security notification email when a user's password changes.
 *
 * @param {string} to   - Recipient email address
 * @param {string} name - User's display name
 * @returns {Promise<void>}
 */
async function sendPasswordChanged(to, name) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const timestamp = new Date().toUTCString();

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Prani password was changed',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Password Changed</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:16px;">
          Your Prani account password was successfully changed on <strong>${timestamp}</strong>.
        </p>
        <p style="color:#c0392b;margin-bottom:24px;">
          <strong>If you did not make this change</strong>, please contact our support team immediately and secure your account.
        </p>
        <a href="${config.frontendUrl}/support"
           style="display:inline-block;padding:12px 28px;background:#c0392b;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Contact Support
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">This is an automated security notification from Prani.</p>
      </div>
    `,
    text: `Hi ${name},\n\nYour Prani account password was changed on ${timestamp}.\n\nIf you did not make this change, contact support immediately:\n${config.frontendUrl}/support`,
  });
}

/**
 * Send a temporary password to a user whose password was reset by an admin.
 *
 * @param {string} to           - Recipient email address
 * @param {string} name         - User's display name
 * @param {string} tempPassword - Plaintext temporary password (shown once)
 * @returns {Promise<void>}
 */
async function sendPasswordReset(to, name, tempPassword) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Prani password has been reset',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Password Reset</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:16px;">An admin has reset your Prani account password. Your temporary password is:</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:16px 20px;text-align:center;font-size:22px;font-weight:700;color:#1a1a2e;letter-spacing:2px;margin-bottom:16px;">
          ${tempPassword}
        </div>
        <p style="color:#c0392b;margin-bottom:24px;"><strong>Please log in and change this password immediately.</strong></p>
        <a href="${config.frontendUrl}/login"
           style="display:inline-block;padding:12px 28px;background:#6c63ff;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Log In Now
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">If you did not expect this, please contact your organisation admin.</p>
      </div>
    `,
    text: `Hi ${name},\n\nAn admin has reset your Prani account password.\n\nTemporary password: ${tempPassword}\n\nPlease log in and change this password immediately:\n${config.frontendUrl}/login`,
  });
}

/**
 * Notify a user that the super admin has granted them a new subscription plan.
 */
async function sendPlanGranted(to, name, plan, grantedByEmail) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Prani plan has been upgraded to ${planLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Plan Upgraded</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:16px;">Great news! Your Prani account has been upgraded to the <strong>${planLabel}</strong> plan by a platform administrator.</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#c9a84c;">Plan: ${planLabel}</p>
        </div>
        <a href="${config.frontendUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#c9a84c;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Go to Dashboard</a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">Questions? Reply to this email or contact ${grantedByEmail}.</p>
      </div>
    `,
    text: `Hi ${name},\n\nYour Prani account has been upgraded to the ${planLabel} plan.\n\nVisit your dashboard:\n${config.frontendUrl}/dashboard`,
  });
}

/**
 * Notify a user that the super admin has granted them a free trial.
 */
async function sendTrialGranted(to, name, plan, trialDays, expiresAt) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : `${trialDays} days`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your ${trialDays}-day ${planLabel} trial on Prani has started`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Trial Started!</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:16px;">A platform administrator has granted you a <strong>${trialDays}-day trial</strong> of the <strong>${planLabel}</strong> plan. Enjoy full access until <strong>${expiry}</strong>.</p>
        <a href="${config.frontendUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#c9a84c;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Start Exploring</a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">After the trial ends your account will revert to the Free plan unless you upgrade.</p>
      </div>
    `,
    text: `Hi ${name},\n\nYou have a ${trialDays}-day ${planLabel} trial until ${expiry}.\n\n${config.frontendUrl}/dashboard`,
  });
}

/**
 * Send a custom support email from the super admin to any user.
 */
async function sendCustomEmail(to, name, subject, message, fromAdminName) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const safeMessage = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <p style="color:#555;margin-bottom:8px;">Hi ${name || to},</p>
        <div style="color:#333;line-height:1.7;margin-bottom:24px;">${safeMessage}</div>
        <p style="color:#aaa;font-size:12px;border-top:1px solid #f0f0f0;padding-top:16px;margin-top:24px;">Sent by ${fromAdminName || 'Prani Support'} via Prani platform.</p>
      </div>
    `,
    text: `Hi ${name || to},\n\n${message}\n\n— ${fromAdminName || 'Prani Support'}`,
  });
}

/**
 * Notify a staff member that a task has been assigned to them.
 *
 * @param {string} to            - Recipient email address
 * @param {string} name          - Recipient's display name
 * @param {string} taskTitle     - Title of the assigned task
 * @param {string|null} eventName - Event the task belongs to (optional)
 * @param {string} dashboardLink - Link to the staff dashboard
 */
async function sendTaskAssigned(to, name, taskTitle, eventName, dashboardLink) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `New task assigned: ${taskTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">New Task Assigned</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:8px;">You have been assigned a new task:</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:16px 20px;margin-bottom:16px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#1a1a2e;">${taskTitle}</p>
          ${eventName ? `<p style="margin:6px 0 0;font-size:13px;color:#888;">Event: ${eventName}</p>` : ''}
        </div>
        <p style="color:#555;margin-bottom:24px;">Log in to your dashboard to view details and update your progress.</p>
        <a href="${dashboardLink}"
           style="display:inline-block;padding:12px 28px;background:#c9a84c;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Go to Dashboard
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">This is an automated notification from Prani. Do not reply to this email.</p>
      </div>
    `,
    text: `Hi ${name},\n\nYou have been assigned a new task: ${taskTitle}${eventName ? `\nEvent: ${eventName}` : ''}\n\nView it on your dashboard:\n${dashboardLink}`,
  });
}

module.exports = {
  sendEmailOtp,
  sendInvitation,
  sendWelcome,
  sendPasswordChanged,
  sendPasswordReset,
  sendPlanGranted,
  sendTrialGranted,
  sendCustomEmail,
  sendTaskAssigned,
};
