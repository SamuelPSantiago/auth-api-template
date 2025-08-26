import crypto from "crypto";
import bcrypt from "bcryptjs";

const RESET_CODE_BYTES = Number(process.env.RESET_TTL_MINUTES ?? 4);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

export function generateResetCode(): string {
  return crypto.randomBytes(RESET_CODE_BYTES).toString("hex");
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password cannot exceed 128 characters.";
  if (!(/[A-Z]/.test(password))) return "Password must contain at least one uppercase letter.";
  if (!(/[a-z]/.test(password))) return "Password must contain at least one lowercase letter.";
  if (!(/\d/.test(password))) return "Password must contain at least one number.";
  if (!(/[^A-Za-z0-9]/.test(password))) return "Password must contain at least one symbol.";
  
  return null;
}

export async function compareResetCode(code: string, codeHash: string): Promise<boolean> {
  return bcrypt.compare(code, codeHash);
}

export async function hashResetCode(code: string): Promise<string> {
  return bcrypt.hash(code, BCRYPT_ROUNDS);
}