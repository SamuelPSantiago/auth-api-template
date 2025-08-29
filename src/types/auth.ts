import jwt from 'jsonwebtoken';

export interface TokenPayload extends jwt.JwtPayload {
  id: number;
  email: string;
}

export interface RefreshTokenPayload extends jwt.JwtPayload {
  id: number;
  email: string;
  tokenId: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenData {
  id: string;
  userId: number;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}