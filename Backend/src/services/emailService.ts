import { Resend } from 'resend';
import config from '../config/env';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

type LegacyEmailEnv = {
  resendApiKey: string;
  resendEmailFrom?: string;
  emailFrom?: string;
};

export async function sendTransactionalEmail(
  envOrInput: LegacyEmailEnv | SendEmailInput,
  maybeInput?: SendEmailInput
): Promise<void> {
  const legacyEnv = maybeInput ? (envOrInput as LegacyEmailEnv) : undefined;
  const input = maybeInput ?? (envOrInput as SendEmailInput);

  const resend = new Resend(legacyEnv?.resendApiKey ?? config.RESEND_API_KEY);
  const result = await resend.emails.send({
    from:
      input.from ??
      legacyEnv?.resendEmailFrom ??
      legacyEnv?.emailFrom ??
      process.env.RESEND_EMAIL_FROM ??
      'Meshly <onboarding@resend.dev>',
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }
}
