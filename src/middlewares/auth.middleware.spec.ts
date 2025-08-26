import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import authenticateClient from './auth.middleware';
import generateTokenApp from '../utils/generateToken';

jest.mock('jsonwebtoken');

const JWT_SECRET = '123';
process.env.JWT_SECRET = JWT_SECRET;

describe('Auth Middleware & Token Generator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('authenticateClient', () => {

    it('✅ deve chamar next() e adicionar id/email ao request com um token válido no header', async () => {
      const tokenPayload = { id: 1, email: 'teste@exemplo.com' };
      const token = 'um-token-valido';
      
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockReturnValue(tokenPayload);

      await authenticateClient(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(jwt.verify).toHaveBeenCalledWith(token, JWT_SECRET);
      expect((mockRequest as any).id).toBe(tokenPayload.id);
      expect((mockRequest as any).email).toBe(tokenPayload.email);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('❌ deve retornar erro 401 se o token não for fornecido', async () => {
      mockRequest.headers = {};

      await authenticateClient(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Asserções
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('❌ deve retornar erro 401 se o token for inválido ou expirado', async () => {
      const invalidToken = 'token-invalido';
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token inválido');
      });

      await authenticateClient(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(jwt.verify).toHaveBeenCalledWith(invalidToken, JWT_SECRET);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('generateTokenApp', () => {
    it('✅ deve chamar jwt.sign com os parâmetros corretos', () => {
      const id = 100;
      const email = 'gerador@teste.com';
      
      generateTokenApp(id, email);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id, email },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
    });
  });
});