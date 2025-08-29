import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateTokenPair, verifyRefreshToken } from "@/utils/generateToken";
import { RefreshTokenService } from "@/services/refreshTokenService";

const refreshTokenSchema = z.object({
  refreshToken: z.string("Refresh token is required").nonempty("Refresh token cannot be empty"),
});

const logoutSchema = z.object({
  refreshToken: z.string("Refresh token is required").nonempty("Refresh token cannot be empty"),
});

function validationError(res: Response, error: z.ZodError) {
  return res.status(400).json({ error: "Validation error", details: error.flatten() });
}

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const storedToken = await RefreshTokenService.findRefreshToken(refreshToken);
    if (!storedToken) {
      return res.status(401).json({ error: "Refresh token not found or expired" });
    }

    if (storedToken.isRevoked) {
      return res.status(401).json({ error: "Refresh token has been revoked" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    await RefreshTokenService.revokeRefreshToken(refreshToken);

    const newRefreshTokenData = await RefreshTokenService.createRefreshToken(
      user.id,
      req.get('User-Agent'),
      req.ip
    );

    const tokens = generateTokenPair(user.id, user.email, newRefreshTokenData.id);

    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      ...tokens
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationError(res, err);
    }
    return next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { refreshToken } = logoutSchema.parse(req.body);

    await RefreshTokenService.revokeRefreshToken(refreshToken);

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationError(res, err);
    }
    return next(err);
  }
};

export const logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    await RefreshTokenService.revokeAllUserTokens(userId);

    return res.status(200).json({ message: "Logged out from all devices successfully" });
  } catch (err) {
    return next(err);
  }
};

export const getActiveSessions = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const activeTokens = await RefreshTokenService.getUserActiveTokens(userId);

    const sessions = activeTokens.map(token => ({
      id: token.id,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      userAgent: token.userAgent,
      ipAddress: token.ipAddress,
    }));

    return res.status(200).json({ sessions });
  } catch (err) {
    return next(err);
  }
};

export const revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const { tokenId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const token = await prisma.refreshToken.findFirst({
      where: {
        id: tokenId,
        userId,
        isRevoked: false,
      },
    });

    if (!token) {
      return res.status(404).json({ error: "Session not found" });
    }

    await RefreshTokenService.revokeRefreshTokenById(tokenId);

    return res.status(200).json({ message: "Session revoked successfully" });
  } catch (err) {
    return next(err);
  }
};
