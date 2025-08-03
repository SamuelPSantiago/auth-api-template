import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { TokenPayload } from '../types/auth';

const authenticateClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.body?.token;

    if (!token) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;

    (req as any).id = decoded.id;
    (req as any).email = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

export default authenticateClient;