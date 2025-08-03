import jwt from 'jsonwebtoken';

export interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequestBody {
  name: string;
  email: string;
  password: string;
}

export interface TokenPayload extends jwt.JwtPayload {
  id: number;
  email: string;
}