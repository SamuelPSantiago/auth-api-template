import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './auth.middleware';
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

  describe('authMiddleware', () => {

    it('should call next() and add id/email to request with a valid token in header', async () => {
      const tokenPayload = { id: 1, email: 'test@example.com' };
      const token = 'valid-token';
      
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockReturnValue(tokenPayload);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(jwt.verify).toHaveBeenCalledWith(token, JWT_SECRET);
      expect((mockRequest as any).userId).toBe(tokenPayload.id);
      expect((mockRequest as any).email).toBe(tokenPayload.email);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 error if token is not provided', async () => {
      mockRequest.headers = {};

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token not provided' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 error if token is invalid or expired', async () => {
      const invalidToken = 'invalid-token';
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(jwt.verify).toHaveBeenCalledWith(invalidToken, JWT_SECRET);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('generateTokenApp', () => {
    it('should call jwt.sign with correct parameters', () => {
      const id = 100;
      const email = 'generator@test.com';
      
      generateTokenApp(id, email);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id, email },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
    });
  });
});