import jwt from 'jsonwebtoken';

export interface TokenPayload extends jwt.JwtPayload {
  id: number;
  email: string;
}