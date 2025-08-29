import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/utils/generateToken';
import { TokenPayload } from '../types/auth';

const authenticateClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.body?.token;

    if (!token) {
      res.status(401).json({ error: 'Token not provided' });
      return;
    }

    const decoded = verifyAccessToken(token) as TokenPayload;

    (req as any).userId = decoded.id;
    (req as any).email = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export { authenticateClient as authMiddleware };