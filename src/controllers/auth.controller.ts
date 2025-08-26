import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

import generateToken from "@/utils/generateToken";
import { sendRegisterEmail } from "@/email";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

const emailSchema = z
  .string("Email is required")
  .email("Invalid email!")
  .transform((s) => s.toLowerCase().trim());

const passwordRegSchema = z
    .string("Password is required")
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password cannot exceed 128 characters.")
    .refine((password) => /[A-Z]/.test(password), "Password must contain at least one uppercase letter.")
    .refine((password) => /[a-z]/.test(password), "Password must contain at least one lowercase letter.")
    .refine((password) => /\d/.test(password), "Password must contain at least one number.")
    .refine((password) => /[^A-Za-z0-9]/.test(password), "Password must contain at least one symbol.");

const passwordLogSchema = z
  .string("Password is required")
  .nonempty("Password cannot be empty");

const nameSchema = z
  .string("Name is required")
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name cannot exceed 50 characters")
  .regex(/^[\p{L}\s'.-]+$/u, "Name can only contain letters and spaces")
  .trim();

const registerSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordRegSchema });
const loginSchema = z.object({ email: emailSchema, password: passwordLogSchema });
const checkEmailSchema = z.object({ email: emailSchema });

function validationError(res: Response, error: z.ZodError) {
  return res.status(400).json({ error: "Validation error", details: error.flatten() });
}

export const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(409).json({ error: "Email is already in use!" });

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    sendRegisterEmail(user.name, user.email);

    const token = generateToken(user.id, user.email);
    return res.status(201).json({ id: user.id, name: user.name, email: user.email, token });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: "Validation error", details: err.flatten() });
    return next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Incorrect email or password!" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect email or password!" });

    const token = generateToken(user.id, user.email);
    return res.status(200).json({ token });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: "Validation error", details: err.flatten() });
    return next(err);
  }
};

export const checkEmailExists = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email } = checkEmailSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) return res.status(200).json({ exists: true, message: "Email is already registered!" });

    return res.status(200).json({ exists: false, message: "Email is available." });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: "Validation error", details: err.flatten() });
    return next(err);
  }
};