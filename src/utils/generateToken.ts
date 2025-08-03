import jwt from 'jsonwebtoken';

export default function generateTokenApp(id: number, email: string) {
  return jwt.sign({ id, email }, process.env.JWT_SECRET as string, { expiresIn: '1d' })
}