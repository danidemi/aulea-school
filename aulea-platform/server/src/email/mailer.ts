import nodemailer from 'nodemailer'

/**
 * Narrow port for sending the confirmation email (SIGN-UP-001) — interface-
 * based for the same reason as `UserRepository`/`ConfirmationTokenRepository`:
 * route tests inject a fake so the DB/SMTP-free unit test suite never talks
 * to a real transport.
 */
export interface Mailer {
  sendConfirmationEmail(to: string, confirmationLink: string): Promise<void>
}

/**
 * Real transport, against Mailpit in local dev (`server/docker-compose.yml`,
 * SMTP port 1025, no auth) — a real SMTP provider is a separate, later
 * decision (out of scope per SIGN-UP-001's Notes).
 */
export function createMailer(smtpHost: string, smtpPort: number): Mailer {
  const transport = nodemailer.createTransport({ host: smtpHost, port: smtpPort })

  return {
    async sendConfirmationEmail(to, confirmationLink) {
      await transport.sendMail({
        from: 'no-reply@aulea-platform.local',
        to,
        subject: 'Confirm your account',
        text: `Confirm your account by visiting: ${confirmationLink}`,
        html: `<p>Confirm your account by visiting: <a href="${confirmationLink}">${confirmationLink}</a></p>`,
      })
    },
  }
}
