import { PrismaClient } from '@prisma/client';
import { RefreshTokenData } from '@/types/auth';
import { generateRandomToken } from '@/utils/generateToken';

const prisma = new PrismaClient();

export class RefreshTokenService {
  static async createRefreshToken(
    userId: number,
    userAgent: string | null = null,
    ipAddress: string | null = null
  ): Promise<RefreshTokenData> {
    const tokenId = generateRandomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const refreshToken = await prisma.refreshToken.create({
      data: {
        token: tokenId,
        userId,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return refreshToken;
  }

  static async findRefreshToken(token: string): Promise<RefreshTokenData | null> {
    return await prisma.refreshToken.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  static async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        token,
      },
      data: {
        isRevoked: true,
      },
    });
  }

  static async revokeRefreshTokenById(tokenId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        token: tokenId,
      },
      data: {
        isRevoked: true,
      },
    });
  }

  static async revokeAllUserTokens(userId: number): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
      },
      data: {
        isRevoked: true,
      },
    });
  }

  static async getUserActiveTokens(userId: number): Promise<RefreshTokenData[]> {
    return await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            isRevoked: true,
          },
        ],
      },
    });

    return result.count;
  }
}
