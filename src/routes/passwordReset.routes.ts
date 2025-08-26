import { Router } from 'express'
import { requestPasswordReset, verifyRecoveryCode, resetPassword } from '../controllers/passwordReset.controller'

const router = Router()

router.post('/request', requestPasswordReset)
router.post('/verify', verifyRecoveryCode)
router.post('/reset', resetPassword)

export default router