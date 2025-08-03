import nodemailer from "nodemailer";
import { SendEmailParams } from "../types/email";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "",
  port: parseInt(process.env.EMAIL_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
});

const fromName = process.env.EMAIL_FROM_NAME || "Uknown";
const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || "";

export async function sendEmail({ toEmail, toName, subject, htmlContent }: SendEmailParams): Promise<void> {
  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: `${toName} <${toEmail}>`,
    subject,
    html: htmlContent,
  });
}