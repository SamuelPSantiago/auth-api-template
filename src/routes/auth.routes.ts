import { Router } from 'express'
import { register, login, checkEmailExists } from '../controllers/auth.controller'

const router = Router()

router.post('/register', register)
router.post('/login', login)

router.post('/check-email', checkEmailExists)

export default router