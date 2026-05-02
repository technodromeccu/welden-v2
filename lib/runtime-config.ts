import type { DeploymentHealth } from "./types";

export function getDeploymentHealth(): DeploymentHealth {
  const authSecretConfigured = Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET !== "welden-dev-session-secret");
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_SENDER_EMAIL);
  const cronConfigured = Boolean(process.env.CRON_SECRET);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  return {
    authSecretConfigured,
    emailConfigured: resendConfigured,
    resendConfigured,
    cronConfigured,
    geminiConfigured,
    readyForProduction: authSecretConfigured && cronConfigured && resendConfigured
  };
}
