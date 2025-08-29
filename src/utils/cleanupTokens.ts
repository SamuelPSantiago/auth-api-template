import { RefreshTokenService } from '@/services/refreshTokenService';

export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const deletedCount = await RefreshTokenService.cleanupExpiredTokens();
    console.log(`Cleaned up ${deletedCount} expired refresh tokens`);
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}

export function startTokenCleanup(intervalHours: number): NodeJS.Timeout {
  return setInterval(async () => {
    await cleanupExpiredTokens();
  }, intervalHours * 60 * 60 * 1000);
}
