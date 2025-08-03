import fs from "fs";
import path from "path";
import nodemailer from 'nodemailer';

import { SendEmailParams } from "../../types/email";

function loadTemplate(templateName: string): string {
  const filePath = path.join(__dirname, "templates", templateName);
  return fs.readFileSync(filePath, "utf-8");
}

function fillTemplate(template: string, data: Record<string, string>): string {
  return Object.entries(data).reduce(
    (output, [key, value]) => output.replace(new RegExp(`{{${key}}}`, "g"), value),
    template
  );
}

async function sendEmail({ toEmail, toName, subject, htmlContent }: SendEmailParams): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST ?? "",
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER ?? "",
        pass: process.env.EMAIL_PASS ?? "",
      },
    });

    const fromName = process.env.EMAIL_FROM_NAME || 'Unknown';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? process.env.EMAIL_USER!;

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: `${toName} <${toEmail}>`,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error(`Send email error: ${error.message}`);
  }
}

export function registerEmail(userName: string, userEmail: string): void {
  const template = loadTemplate("registerEmail.html");
  const body = fillTemplate(template, { USERNAME: userName });

  sendEmail({
    toEmail: userEmail,
    toName: userName,
    subject: "Bem-vindo!",
    htmlContent: body
  });
}

export function passwordRecoveryEmail(userName: string, userEmail: string, code: string): void {
  const template = loadTemplate("passwordRecoveryEmail.html");
  const body = fillTemplate(template, { USERNAME: userName, CODE: code });

  sendEmail({
    toEmail: userEmail,
    toName: userName,
    subject: "Código de recuperação de senha",
    htmlContent: body
  });
}