import express from 'express'
import cors from 'cors';

import authRouter from "./routes/auth.routes"
import resetPasswordRouter from "./routes/passwordReset.routes"

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


app.use(express.json());

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/reset-password', resetPasswordRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))