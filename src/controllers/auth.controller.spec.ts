import type { Request, Response, NextFunction } from "express";

jest.mock("@/lib/prisma", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  return { __esModule: true, prisma, default: prisma };
});

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("@/utils/generateToken", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/email", () => ({ sendRegisterEmail: jest.fn() }));

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import generateToken from "@/utils/generateToken";
import { sendRegisterEmail } from "@/email";
import { register, login, checkEmailExists } from "@/controllers/auth.controller";

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

describe("Auth Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("register", () => {
        it("Registration must be completed successfully", async () => {
            const req = mockReq({ name: "Samuel Silva", email: "USER@Email.com", password: "VerySecure123!" });
            const res = mockRes();
            const next = nextFn();

            asMock(prisma.user.findUnique).mockResolvedValue(null);
            asMock(bcrypt.hash).mockResolvedValue("hashed");
            asMock(prisma.user.create).mockResolvedValue({ id: "u1", name: "Samuel Silva", email: "user@email.com", password: "hashed" });
            asMock(sendRegisterEmail as any).mockResolvedValue(undefined);
            asMock(generateToken as any).mockReturnValue("jwt-token");

            await register(req, res, next);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "user@email.com" } });
            expect(bcrypt.hash).toHaveBeenCalledWith("VerySecure123!", expect.any(Number));
            expect(prisma.user.create).toHaveBeenCalled();
            expect(sendRegisterEmail).toHaveBeenCalledWith("Samuel Silva", "user@email.com");
            expect(generateToken).toHaveBeenCalledWith("u1", "user@email.com");
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ id: "u1", name: "Samuel Silva", email: "user@email.com", token: "jwt-token" });
        });

        it("Should return 409 when email already exists", async () => {
            const req = mockReq({ name: "Samuel", email: "sam@email.com", password: "VerySecure123!" });
            const res = mockRes();
            const next = nextFn();

            asMock(prisma.user.findUnique).mockResolvedValue({ id: "u1" });

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ error: "Email is already in use!" });
        });

        it("Should return 400 on validation error (short name)", async () => {
            const req = mockReq({ name: "S", email: "sam@email.com", password: "VerySecure123!" });
            const res = mockRes();
            const next = nextFn();

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Validation error" }));
        });

        it("Should return 400 on validation error (invalid password)", async () => {
            const req = mockReq({ name: "Samuel", email: "sam@email.com", password: "ops" });
            const res = mockRes();
            const next = nextFn();

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Validation error" }));
        });

        it("Should forward unexpected error to next", async () => {
            const req = mockReq({ name: "Samuel", email: "sam@email.com", password: "VerySecure123!" });
            const res = mockRes();
            const next = jest.fn();

            asMock(prisma.user.findUnique).mockResolvedValue(null);
            asMock(bcrypt.hash).mockResolvedValue("hashed");
            asMock(prisma.user.create).mockRejectedValue(new Error("db down"));

            await register(req, res, next as any);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe("login", () => {
        it("Must log into the account successfully", async () => {
            const req = mockReq({ email: "SAM@Email.com", password: "correct-password" });
            const res = mockRes();
            const next = nextFn();

            asMock(prisma.user.findUnique).mockResolvedValue({ id: "u1", email: "sam@email.com", password: "hashed" });
            asMock(bcrypt.compare).mockResolvedValue(true);
            asMock(generateToken as any).mockReturnValue("jwt-token");

            await login(req, res, next);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "sam@email.com" } });
            expect(bcrypt.compare).toHaveBeenCalledWith("correct-password", "hashed");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ token: "jwt-token" });
        });

        it("Should return 400 when email is invalid", async () => {
            const req = mockReq({ email: "invalid-email", password: "12345678" });
            const res = mockRes();
            const next = nextFn();

            await login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Validation error" }));
        });

        it("Should return 401 when user does not exist", async () => {
            const req = mockReq({ email: "sam@email.com", password: "whatever" });
            const res = mockRes();
            const next = nextFn();

            asMock(prisma.user.findUnique).mockResolvedValue(null);

            await login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: "Incorrect email or password!" });
        });

        it("Should return 401 when password is invalid", async () => {
            const req = mockReq({ email: "sam@email.com", password: "wrong" });
            const res = mockRes();
            const next = nextFn();

            asMock(prisma.user.findUnique).mockResolvedValue({ id: "u1", email: "sam@email.com", password: "hashed" });
            asMock(bcrypt.compare).mockResolvedValue(false);

            await login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: "Incorrect email or password!" });
        });
    });

    describe("checkEmailExists", () => {
        it("Should return exists: true when email exists", async () => {
            const req = mockReq({ email: "exists@email.com" });
            const res = mockRes();
            const next = nextFn();

            asMock(prisma.user.findUnique).mockResolvedValue({ id: "u1" });

            await checkEmailExists(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ exists: true, message: "Email is already registered!" });
        });

        it("Should return exists: false when email does not exist", async () => {
            const req = mockReq({ email: "new@email.com" });
            const res = mockRes();
            const next = nextFn();

            asMock(prisma.user.findUnique).mockResolvedValue(null);

            await checkEmailExists(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ exists: false, message: "Email is available." });
        });

        it("Should return 400 when email is invalid", async () => {
            const req = mockReq({ email: "bad" });
            const res = mockRes();
            const next = nextFn();

            await checkEmailExists(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Validation error" }));
        });

        it("Should return 400 when email is missing", async () => {
            const req = mockReq({});
            const res = mockRes();
            const next = nextFn();

            await checkEmailExists(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Validation error" }));
        });
    });
});