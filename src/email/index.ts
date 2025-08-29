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

export async function sendRegisterEmail(userName: string, userEmail: string): Promise<void> {
  const template = loadTemplate("register.html");
  const body = fillTemplate(template, { USERNAME: userName });

  await sendEmail({
    toEmail: userEmail,
    toName: userName,
    subject: "Welcome!",
    htmlContent: body
  });
}

export function sendPasswordResetEmail(userName: string, userEmail: string, code: string): void {
  const template = loadTemplate("passwordResetEmail.html");
  const body = fillTemplate(template, { USERNAME: userName, CODE: code });

  sendEmail({
    toEmail: userEmail,
    toName: userName,
    subject: "Password recovery code",
    htmlContent: body
  });
}