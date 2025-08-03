import express from 'express'
import cors from 'cors';

import authRouter from "./routes/auth"

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


app.use(express.json());

app.use('/api/v1/auth', authRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))