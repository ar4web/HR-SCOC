import nodemailer from 'nodemailer';

export interface SmtpOptions {
  host: string;
  port: number;
  user: string;
  pass?: string;
  encryption?: 'tls' | 'ssl' | 'none';
  fromName: string;
  fromEmail: string;
}

export interface SendSmtpInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedKey = '';

export async function sendViaSmtp(opts: SendSmtpInput, settings: SmtpOptions): Promise<{ id: string }> {
  const key = JSON.stringify({ host: settings.host, port: settings.port, user: settings.user, pass: settings.pass });
  if (!cachedTransporter || cachedKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.encryption === 'ssl',
      requireTLS: settings.encryption === 'tls',
      auth: settings.user ? { user: settings.user, pass: settings.pass || '' } : undefined,
    });
    cachedKey = key;
  }

  await cachedTransporter.verify();

  const info = await cachedTransporter.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  return { id: info.messageId };
}