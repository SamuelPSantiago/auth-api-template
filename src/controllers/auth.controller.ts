import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import generateToken from "../utils/generateToken";
import { registerEmail, passwordRecoveryEmail } from "../services/email";

import { RegisterRequestBody, LoginRequestBody } from "../types/auth";

const prisma = new PrismaClient();

export const register = async (req: Request<any, any, RegisterRequestBody>, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes ou incompletos!" });
    }

    const userExists = await prisma.user.findFirst({
      where: { OR: [{ email }] },
    });

    if (userExists) return res.status(400).json({ error: "O email já está em uso!" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    registerEmail(user.name, user.email);

    const token = generateToken(user.id, user.email);
    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request<any, any, LoginRequestBody>, res: Response, next: NextFunction): Promise<any> => {
  try {
    let { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ error: "Preencha todos os campos!" });

    email = email.toLowerCase().trim();
    const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.toLowerCase())

    if (!isValidEmail(email))
      return res.status(400).json({ error: "Email inválido!" });

    const user = await prisma.user.findUnique({ where: { email }, include: { discoveryProgress: true } });
    if (!user) return res.status(400).json({ error: "Email e/ou senha incorretos!" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Email e/ou senha incorretos!" });

    const token = generateToken(user.id, user.email);

    return res.json({
      token,
    });
  } catch (err) {
    next(err);
  }
};

export const checkEmailExists = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    let { email } = req.body;

    if (!email)
      return res
        .status(400)
        .json({ error: "Preencha o campo de email!" });

    email = email.toLowerCase().trim();

    const isValidEmail = (email: string): boolean =>
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    if (!isValidEmail(email))
      return res.status(400).json({ error: "Email inválido!" });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      return res
        .status(200)
        .json({ exists: true, message: "Email já cadastrado no banco!" });
    }

    return res
      .status(200)
      .json({ exists: false, message: "Email disponível." });
  } catch (err) {
    next(err);
  }
};

export const sendRecoveryCode = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

    await prisma.passwordReset.create({
      data: { email, code, expiresAt },
    });

    passwordRecoveryEmail(user.name, user.email, code);

    return res.status(200).json({ message: "Código enviado para o email" });
  } catch (err) {
    next(err);
  }
}

export const verifyRecoveryCode = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, code } = req.body;

    const record = await prisma.passwordReset.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) return res.status(400).json({ error: "Código inválido ou expirado" });

    return res.status(200).json({ message: "Código válido" });
  } catch (err) {
    next(err);
  }
}

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, code, newPassword } = req.body;

    const record = await prisma.passwordReset.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) return res.status(400).json({ error: "Código inválido ou expirado" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await prisma.passwordReset.update({
      where: { id: record.id },
      data: { used: true },
    });

    return res.status(200).json({ message: "Senha redefinida com sucesso" });
  } catch (err) {
    next(err);
  }
}