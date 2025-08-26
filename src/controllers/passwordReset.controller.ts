import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

import { validatePasswordPolicy, generateResetCode } from "@/utils/passwordReset";
import { sendPasswordResetEmail } from "@/email";

const RESET_TTL_MINUTES = Number(process.env.RESET_TTL_MINUTES ?? 15);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const MAX_REQUESTS_PER_HOUR_PER_EMAIL = Number(process.env.MAX_REQUESTS_PER_HOUR_PER_EMAIL ?? 3);
const MAX_VERIFICATION_ATTEMPTS = Number(process.env.MAX_VERIFICATION_ATTEMPTS ?? 5);

const emailSchema = z
  .string("Email is required")
  .email("Invalid email!")
  .transform((s) => s.toLowerCase().trim());

const codeSchema = z
  .string("Code is required")
  .min(6, "Code must be at least 6 characters.")
  .max(64, "Code cannot exceed 64 characters.");

const passwordSchema = z
  .string("Password is required")
  .min(8, "Password must be at least 8 characters.")
  .max(128, "")
  .refine((password) => /[A-Z]/.test(password), "Password must contain at least one uppercase letter.")
  .refine((password) => /[a-z]/.test(password), "Password must contain at least one lowercase letter.")
  .refine((password) => /\d/.test(password), "Password must contain at least one number.")
  .refine((password) => /[^A-Za-z0-9]/.test(password), "Password must contain at least one symbol.");

const requestResetSchema = z.object({ email: emailSchema });
const verifySchema = z.object({ email: emailSchema, code: codeSchema });
const resetSchema = z.object({ email: emailSchema, code: codeSchema, newPassword: passwordSchema });

async function checkThrottle(email: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const count = await prisma.passwordReset.count({
    where: { email, createdAt: { gte: oneHourAgo } },
  });

  if (count >= MAX_REQUESTS_PER_HOUR_PER_EMAIL)
    throw new Error("RATE_LIMIT");
}

export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const genericResponse = {
    message: "If the email is registered, we will send recovery instructions.",
  };

  try {
    const { email } = requestResetSchema.parse(req.body);

    try {
      await checkThrottle(email);
    } catch {
      return res.status(200).json(genericResponse);
    }

    const code = generateResetCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.passwordReset.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      await tx.passwordReset.create({
        data: {
          email,
          codeHash,
          used: false,
          expiresAt,
          requestedIp: req.ip ?? null,
          requestedUserAgent: req.headers["user-agent"] ?? null,
          attempts: 0,
        },
      });
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true },
    });
    const userName = user?.name ?? "User";

    sendPasswordResetEmail(userName, email, code);
    return res.status(200).json(genericResponse);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(200).json(genericResponse);
    next(err);
  }
};

export const verifyRecoveryCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { email, code } = verifySchema.parse(req.body);

    const record = await prisma.passwordReset.findFirst({
      where: {
        email,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await prisma.passwordReset.update({
        where: { id: record.id },
        data: { used: true },
      });
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const isValid = await bcrypt.compare(code, record.codeHash);
    if (!isValid) {
      await prisma.passwordReset.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    return res.status(200).json({ message: "Valid code" });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: "Validation error", details: err.flatten() });
    next(err);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { email, code, newPassword } = resetSchema.parse(req.body);

    const policyError = validatePasswordPolicy(newPassword);
    if (policyError) return res.status(400).json({ error: policyError });

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.passwordReset.findFirst({
        where: {
          email,
          used: false,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!record) {
        return { ok: false as const };
      }

      if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await tx.passwordReset.update({
          where: { id: record.id },
          data: { used: true },
        });
        return { ok: false as const };
      }

      const isValid = await bcrypt.compare(code, record.codeHash);
      if (!isValid) {
        await tx.passwordReset.update({
          where: { id: record.id },
          data: { attempts: { increment: 1 } },
        });
        return { ok: false as const };
      }

      const user = await tx.user.findUnique({
        where: { email },
        select: { password: true, passwordVersion: true },
      });
      if (!user) {
        await tx.passwordReset.update({
          where: { id: record.id },
          data: { used: true },
        });
        return { ok: true as const };
      }

      const isSameAsOld = await bcrypt.compare(newPassword, user.password);
      if (isSameAsOld) {
        return {
          ok: false as const,
          error: "The new password must be different from the previous one.",
        };
      }

      const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await tx.user.update({
        where: { email },
        data: {
          password: newHash,
          passwordChangedAt: now,
          passwordVersion: { increment: 1 },
        },
      });

      await tx.passwordReset.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      return { ok: true as const };
    });

    if (!result.ok) {
      return res.status(400).json({
        error: result.error ?? "Invalid or expired code",
      });
    }

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: "Validation error", details: err.flatten() });
    next(err);
  }
};