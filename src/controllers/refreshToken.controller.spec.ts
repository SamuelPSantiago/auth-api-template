import { Request, Response } from 'express';
import { refresh, logout, logoutAll, getActiveSessions, revokeSession } from './refreshToken.controller';
import { RefreshTokenService } from '@/services/refreshTokenService';
import { generateTokenPair, verifyRefreshToken } from '@/utils/generateToken';
import { prisma } from '@/lib/prisma';


jest.mock('@/services/refreshTokenService');
jest.mock('@/utils/generateToken');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      findFirst: jest.fn(),
    },
  },
}));

const mockRefreshTokenService = RefreshTokenService as jest.Mocked<typeof RefreshTokenService>;
const mockGenerateTokenPair = generateTokenPair as jest.MockedFunction<typeof generateTokenPair>;
const mockVerifyRefreshToken = verifyRefreshToken as jest.MockedFunction<typeof verifyRefreshToken>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('RefreshToken Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      headers: {},
      get: jest.fn(),
      ip: '127.0.0.1',
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockPayload = { id: 1, email: 'test@example.com', tokenId: 'token123' };
      const mockStoredToken = {
        id: 'token123',
        userId: 1,
        token: 'refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: false,
        createdAt: new Date(),
        userAgent: null,
        ipAddress: null,
      };
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      };

      mockRequest.body = { refreshToken: 'valid-refresh-token' };
      mockVerifyRefreshToken.mockReturnValue(mockPayload);
      mockRefreshTokenService.findRefreshToken.mockResolvedValue(mockStoredToken);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockRefreshTokenService.revokeRefreshToken.mockResolvedValue();
      mockRefreshTokenService.createRefreshToken.mockResolvedValue(mockStoredToken);
      mockGenerateTokenPair.mockReturnValue(mockTokens);

      await refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        ...mockTokens,
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      mockRequest.body = { refreshToken: 'invalid-token' };
      mockVerifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
    });

    it('should return 401 for revoked refresh token', async () => {
      const mockPayload = { id: 1, email: 'test@example.com', tokenId: 'token123' };
      const mockStoredToken = {
        id: 'token123',
        userId: 1,
        token: 'refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: true,
        createdAt: new Date(),
        userAgent: null,
        ipAddress: null,
      };

      mockRequest.body = { refreshToken: 'valid-refresh-token' };
      mockVerifyRefreshToken.mockReturnValue(mockPayload);
      mockRefreshTokenService.findRefreshToken.mockResolvedValue(mockStoredToken);

      await refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Refresh token has been revoked' });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockRequest.body = { refreshToken: 'valid-refresh-token' };
      mockRefreshTokenService.revokeRefreshToken.mockResolvedValue();

      await logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });

  describe('logoutAll', () => {
    it('should logout from all devices successfully', async () => {
      (mockRequest as any).userId = 1;
      mockRefreshTokenService.revokeAllUserTokens.mockResolvedValue();

      await logoutAll(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Logged out from all devices successfully' });
    });

    it('should return 401 if user not authenticated', async () => {
      await logoutAll(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions', async () => {
      const mockTokens = [
        {
          id: 'token1',
          userId: 1,
          token: 'token1',
          expiresAt: new Date(Date.now() + 86400000),
          isRevoked: false,
          createdAt: new Date(),
          userAgent: 'Mozilla/5.0',
          ipAddress: '127.0.0.1',
        },
      ];

      (mockRequest as any).userId = 1;
      mockRefreshTokenService.getUserActiveTokens.mockResolvedValue(mockTokens);

      await getActiveSessions(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        sessions: [
          {
            id: 'token1',
            createdAt: mockTokens[0].createdAt,
            expiresAt: mockTokens[0].expiresAt,
            userAgent: 'Mozilla/5.0',
            ipAddress: '127.0.0.1',
          },
        ],
      });
    });
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      const mockToken = {
        id: 'token1',
        userId: 1,
        token: 'token1',
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: false,
        createdAt: new Date(),
        userAgent: null,
        ipAddress: null,
      };

      (mockRequest as any).userId = 1;
      mockRequest.params = { tokenId: 'token1' };
      (mockPrisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(mockToken);
      mockRefreshTokenService.revokeRefreshTokenById.mockResolvedValue();

      await revokeSession(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Session revoked successfully' });
    });

    it('should return 404 for non-existent session', async () => {
      (mockRequest as any).userId = 1;
      mockRequest.params = { tokenId: 'non-existent' };
      (mockPrisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await revokeSession(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Session not found' });
    });
  });
});
