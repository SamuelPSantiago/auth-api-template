import nodemailer from "nodemailer";
import { SendEmailParams } from "../types/email";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_HOST || "";
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER || "";
  const pass = process.env.EMAIL_PASS || "";
  const secureEnv = (process.env.EMAIL_SECURE || "").toLowerCase();
  const secure = secureEnv === "true" || port === 465;

  const isDev = (process.env.NODE_ENV || "development") === "development";

  const baseConfig = isDev && !host
    ? { jsonTransport: true }
    : {
        pool: true,
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
        maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS || "5", 10),
        maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES || "100", 10),
      };

  cachedTransporter = nodemailer.createTransport(baseConfig);
  return cachedTransporter;
}

const fromName = process.env.EMAIL_FROM_NAME || "Unknown";
const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || "";

function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateTextFromHtml(html: string): string {
  const withoutStyles = html.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutScripts = withoutStyles.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const withNewlines = withoutScripts
    .replace(/<\/(p|div|br|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li>/gi, " - ");
  const stripped = withNewlines.replace(/<[^>]+>/g, " ");
  return stripped.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

export async function sendEmail({ toEmail, toName, subject, htmlContent, textContent }: SendEmailParams): Promise<void> {
  const transporter = getTransporter();

  try {
    if (!toEmail || !isValidEmailAddress(toEmail)) {
      throw new Error("Invalid recipient email address");
    }
    if (!subject) {
      throw new Error("Email subject is required");
    }
    if (!htmlContent) {
      throw new Error("Email htmlContent is required");
    }

    const fromHeaderAddress = fromAddress;
    const isDev = (process.env.NODE_ENV || "development") === "development";
    if (!fromHeaderAddress && !isDev) {
      throw new Error("Sender address is not configured");
    }

    await transporter.sendMail({
      from: fromHeaderAddress ? `"${fromName}" <${fromHeaderAddress}>` : undefined,
      to: `${toName} <${toEmail}>`,
      subject,
      html: htmlContent,
      text: textContent || generateTextFromHtml(htmlContent),
    });
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to send email to ${toEmail}: ${err.message}`);
  }
}