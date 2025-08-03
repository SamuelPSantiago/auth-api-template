import fs from "fs";
import path from "path";

import { sendEmail } from "../services/emailService";

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