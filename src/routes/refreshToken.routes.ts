import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { refresh, logout, logoutAll, getActiveSessions, revokeSession } from "@/controllers/refreshToken.controller";

const router = Router();

router.post("/refresh", refresh);

router.post("/logout", authMiddleware, logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.get("/sessions", authMiddleware, getActiveSessions);
router.delete("/sessions/:tokenId", authMiddleware, revokeSession);

export default router;
