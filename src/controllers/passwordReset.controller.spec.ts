import type { Request, Response, NextFunction } from "express";

jest.mock("@/lib/prisma", () => {
  const prisma = {
    passwordReset: {
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { __esModule: true, prisma, default: prisma };
});

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("@/utils/passwordReset", () => ({
  __esModule: true,
  generateResetCode: jest.fn(),
  validatePasswordPolicy: jest.fn(),
}));

jest.mock("@/email", () => ({
  __esModule: true,
  sendPasswordResetEmail: jest.fn()
}));

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  validatePasswordPolicy,
  generateResetCode,
} from '@/utils/passwordReset';
import { sendPasswordResetEmail } from "@/email";
import {
  requestPasswordReset,
  verifyRecoveryCode,
  resetPassword,
} from '@/controllers/passwordReset.controller';

const asMock = <T extends (...args: any[]) => any>(fn: unknown) =>
  fn as unknown as jest.Mock<ReturnType<T>, Parameters<T>>;

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response & { status: jest.Mock; json: jest.Mock };
  return res;
}

function mockReq(body: any) {
  return { body } as unknown as Request;
}

const nextFn = () => jest.fn() as unknown as NextFunction;

describe("PasswordReset Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('Creates a reset record and sends email when not rate-limited', async () => {
      asMock(prisma.passwordReset.count).mockResolvedValue(0);
      asMock(generateResetCode).mockReturnValue('ABC123');
      asMock(bcrypt.hash).mockResolvedValue('hashed-ABC123');
      asMock(prisma.user.findUnique).mockResolvedValue({ name: 'User' });
      
      asMock(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          passwordReset: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue({ id: "r1" }),
          },
        };
        return fn(tx);
      });
      
      const req: any = {
        body: { email: 'USER@EXAMPLE.COM' },
        ip: '1.2.3.4',
        headers: { 'user-agent': 'jest' },
      };
      const res = mockRes();

      await requestPasswordReset(req, res, nextFn());

      expect(prisma.passwordReset.count).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(generateResetCode).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('ABC123', expect.any(Number));
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('User', 'user@example.com', 'ABC123');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Returns 200 when rate-limited and does not send email', async () => {
      asMock(prisma.passwordReset.count).mockResolvedValue(999);

      const req: any = { body: { email: 'user@example.com' }, ip: '1.2.3.4', headers: {} };
      const res = mockRes();

      await requestPasswordReset(req, res, nextFn());

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Returns 200 on Zod validation error (invalid email)', async () => {
      const req = mockReq({ email: 'not-an-email' });
      const res = mockRes();

      await requestPasswordReset(req, res, nextFn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyRecoveryCode', () => {
    it('Returns 200 when token is valid', async () => {
      const record = { id: 'r1', codeHash: 'h', attempts: 0 };
      asMock(prisma.passwordReset.findFirst).mockResolvedValue(record);
      asMock(bcrypt.compare).mockResolvedValue(true);

      const req = mockReq({ email: 'user@example.com', code: 'ABC123' });
      const res = mockRes();

      await verifyRecoveryCode(req, res, nextFn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Valid code' });
    });

    it('Returns 400 when no record exists', async () => {
      asMock(prisma.passwordReset.findFirst).mockResolvedValue(null);

      const req = mockReq({ email: 'user@example.com', code: 'ABC123' });
      const res = mockRes();

      await verifyRecoveryCode(req, res, nextFn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired code' });
    });

    it('Marks token used and returns 400 when attempts exceeded', async () => {
      const rec = { id: 'r1', codeHash: 'h', attempts: 999 };
      asMock(prisma.passwordReset.findFirst).mockResolvedValue(rec);
      asMock(prisma.passwordReset.update).mockResolvedValue({});

      const req = mockReq({ email: 'user@example.com', code: 'ABC123' });
      const res = mockRes();

      await verifyRecoveryCode(req, res, nextFn());

      expect(prisma.passwordReset.update).toHaveBeenCalledWith({ where: { id: rec.id }, data: { used: true } });
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Increments attempts and returns 400 when code invalid', async () => {
      const rec = { id: 'r1', codeHash: 'h', attempts: 0 };
      asMock(prisma.passwordReset.findFirst).mockResolvedValue(rec);
      asMock(bcrypt.compare).mockResolvedValue(false);

      const req = mockReq({ email: 'user@example.com', code: 'WRONG1' });
      const res = mockRes();

      await verifyRecoveryCode(req, res, nextFn());

      expect(prisma.passwordReset.update).toHaveBeenCalledWith({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('resetPassword', () => {
    it('Returns 400 on invalid request (Zod)', async () => {
      const req = mockReq({ email: 'user@example.com', code: 'ABC' });
      const res = mockRes();

      await resetPassword(req, res, nextFn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Returns 400 when password policy fails', async () => {
      asMock(validatePasswordPolicy).mockReturnValue('Invalid request');

      const req = mockReq({ email: 'user@example.com', code: 'ABC123', newPassword: 'Strong1!' });
      const res = mockRes();

      await resetPassword(req, res, nextFn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid request' });
    });

    it('Returns 400 when no valid passwordReset record found', async () => {
      asMock(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          passwordReset: {
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
            updateMany: jest.fn(),
          },
          user: {
            findUnique: jest.fn(),
            update: jest.fn(),
          },
        };
        return fn(tx);
      });

      const req = mockReq({ email: 'user@example.com', code: 'ABC123', newPassword: 'Strong1!' });
      const res = mockRes();

      await resetPassword(req, res, nextFn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Marks token used and returns 400 when attempts exceeded inside transaction', async () => {
      asMock(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          passwordReset: {
            findFirst: jest.fn().mockResolvedValue({ id: 'r1', attempts: 999, codeHash: 'h' }),
            update: jest.fn().mockResolvedValue({}),
            updateMany: jest.fn(),
          },
          user: { findUnique: jest.fn(), update: jest.fn() },
        };
        return fn(tx);
      });

      const req = mockReq({ email: 'user@example.com', code: 'ABC123', newPassword: 'Strong1!' });
      const res = mockRes();

      await resetPassword(req, res, nextFn());

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Increments attempts and returns 400 when code invalid inside transaction', async () => {
      asMock(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          passwordReset: {
            findFirst: jest.fn().mockResolvedValue({ id: 'r1', attempts: 0, codeHash: 'h' }),
            update: jest.fn().mockResolvedValue({}),
            updateMany: jest.fn(),
          },
          user: { findUnique: jest.fn(), update: jest.fn() },
        };
        return fn(tx);
      });

      asMock(bcrypt.compare).mockResolvedValue(false);

      const req = mockReq({ email: 'user@example.com', code: 'WRONG1', newPassword: 'Strong1!' });
      const res = mockRes();

      await resetPassword(req, res, nextFn());

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Returns 200 when user not found (safe success)', async () => {
      asMock(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          passwordReset: {
            findFirst: jest.fn().mockResolvedValue({ id: 'r1', attempts: 0, codeHash: 'h' }),
            update: jest.fn(),
            updateMany: jest.fn().mockResolvedValue({}),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
          },
        };
        asMock(bcrypt.compare).mockResolvedValue(true);
        return fn(tx);
      });

      const req = mockReq({ email: 'user@example.com', code: 'ABC123', newPassword: 'Strong1!' });
      const res = mockRes();

      await resetPassword(req, res, nextFn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successfully' });
    });

    it('Returns 400 when new password equals old password', async () => {
      asMock(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          passwordReset: {
            findFirst: jest.fn().mockResolvedValue({ id: 'r1', attempts: 0, codeHash: 'h' }),
            update: jest.fn(),
            updateMany: jest.fn(),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({ password: 'oldHash', passwordVersion: 1 }),
            update: jest.fn(),
          },
        };
        asMock(bcrypt.compare).mockImplementation(async (a: string, b: string) => {
          if (a === 'ABC123') return true;
          return true;
        });
        return fn(tx);
      });

      const req = mockReq({ email: 'user@example.com', code: 'ABC123', newPassword: 'SameAsOld1!' });
      const res = mockRes();

      await resetPassword(req, res, nextFn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'The new password must be different from the previous one.' });
    });

    it('Successfully resets the password', async () => {
      asMock(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          passwordReset: {
            findFirst: jest.fn().mockResolvedValue({ id: 'r1', attempts: 0, codeHash: 'h' }),
            update: jest.fn(),
            updateMany: jest.fn().mockResolvedValue({}),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({ password: 'oldHash', passwordVersion: 1 }),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        let call = 0;
        asMock(bcrypt.compare).mockImplementation(async () => {
          call += 1;
          return call === 1 ? true : false;
        });
        asMock(bcrypt.hash).mockResolvedValue('newHash');
        return fn(tx);
      });

      const req = mockReq({ email: 'user@example.com', code: 'ABC123', newPassword: 'NewStrong1!' });
      const res = mockRes();

      await resetPassword(req, res, nextFn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successfully' });
    });
  });
});