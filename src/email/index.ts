import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

import { enqueueEmail } from "../services/emailQueue";

const templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();
const isDev = (process.env.NODE_ENV || "development") === "development";

function compileTemplate(templateName: string): Handlebars.TemplateDelegate {
  if (!isDev) {
    const cached = templateCache.get(templateName);
    if (cached) return cached;
  }

  const filePath = path.join(__dirname, "templates", templateName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Email template not found: ${templateName}`);
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const compiled = Handlebars.compile(content, { noEscape: false });

  if (!isDev) templateCache.set(templateName, compiled);
  return compiled;
}

function renderTemplate(templateName: string, data: Record<string, unknown>): string {
  const tpl = compileTemplate(templateName);
  return tpl(data);
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function sendRegisterEmail(userName: string, userEmail: string): Promise<void> {
  const html = renderTemplate("register.html", {
    USERNAME: userName,
    PREHEADER: `Bem-vindo, ${userName}! Sua conta foi criada com sucesso.`,
  });

  enqueueEmail({
    toEmail: userEmail,
    toName: userName,
    subject: "Welcome!",
    htmlContent: html,
    textContent: stripHtml(html),
  });
}

export async function sendPasswordResetEmail(userName: string, userEmail: string, code: string): Promise<void> {
  const html = renderTemplate("passwordReset.html", {
    USERNAME: userName,
    CODE: code,
    PREHEADER: `Olá ${userName}, aqui está seu código para redefinir a senha.`,
  });

  enqueueEmail({
    toEmail: userEmail,
    toName: userName,
    subject: "Password reset",
    htmlContent: html,
    textContent: stripHtml(html),
  });
}