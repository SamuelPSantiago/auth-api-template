import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateTokenPair } from '@/utils/generateToken';
import { RefreshTokenService } from '@/services/refreshTokenService';
import { sendRegisterEmail } from '@/email';

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

const isValidName = (name: string): boolean => {
  return name.length >= 2;
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password are required' });
      return;
    }

    if (!isValidName(name)) {
      res.status(400).json({ error: 'Validation error' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Validation error' });
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json({ error: 'Validation error' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      res.status(409).json({ error: 'Email is already in use!' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    });

    const refreshTokenData = await RefreshTokenService.createRefreshToken(
      user.id,
      req.headers['user-agent'] || null,
      req.ip || null
    );

    const tokens = generateTokenPair(user.id, user.email, refreshTokenData.id);

    await sendRegisterEmail(user.name, user.email);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Validation error' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      res.status(401).json({ error: 'Incorrect email or password!' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Incorrect email or password!' });
      return;
    }

    const refreshTokenData = await RefreshTokenService.createRefreshToken(
      user.id,
      req.headers['user-agent'] || null,
      req.ip || null
    );

    const tokens = generateTokenPair(user.id, user.email, refreshTokenData.id);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

export const checkEmailExists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Validation error' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      res.status(200).json({ 
        exists: true, 
        message: 'Email is already registered!' 
      });
      return;
    }

    res.status(200).json({ 
      exists: false, 
      message: 'Email is available.' 
    });
  } catch (error) {
    next(error);
  }
};