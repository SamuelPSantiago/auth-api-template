import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenResponse, RefreshTokenPayload } from '@/types/auth';

export default function generateTokenApp(id: number, email: string) {
  return jwt.sign({ id, email }, process.env.JWT_SECRET as string, { expiresIn: '1d' })
}

export function generateAccessToken(id: number, email: string): string {
  return jwt.sign(
    { id, email }, 
    process.env.JWT_SECRET as string, 
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(id: number, email: string, tokenId: string): string {
  return jwt.sign(
    { id, email, tokenId }, 
    process.env.JWT_REFRESH_SECRET as string, 
    { expiresIn: '7d' }
  );
}

export function generateTokenPair(id: number, email: string, tokenId: string): TokenResponse {
  const accessToken = generateAccessToken(id, email);
  const refreshToken = generateRefreshToken(id, email, tokenId);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60
  };
}

export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as RefreshTokenPayload;
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET as string);
}