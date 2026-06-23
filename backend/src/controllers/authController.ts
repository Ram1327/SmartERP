import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/db.js';

// Zod validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});

const accessSecret = process.env.JWT_ACCESS_SECRET || 'smarterp_access_secret_key_1327_super_secure_3c9284cfb';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'smarterp_refresh_secret_key_1327_super_secure_9bf8c187';
const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const parsedBody = registerSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation error', details: parsedBody.error.flatten() });
      }

      const { email, password } = parsedBody.data;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });

      return res.status(201).json({
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error during registration' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const parsedBody = loginSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation error', details: parsedBody.error.flatten() });
      }

      const { email, password } = parsedBody.data;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        accessSecret,
        { expiresIn: accessExpiresIn as jwt.SignOptions['expiresIn'] }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, email: user.email },
        refreshSecret,
        { expiresIn: refreshExpiresIn as jwt.SignOptions['expiresIn'] }
      );

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      jwt.verify(refreshToken, refreshSecret, (err: any, decoded: any) => {
        if (err) {
          return res.status(403).json({ error: 'Invalid or expired refresh token' });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
          { userId: decoded.userId, email: decoded.email },
          accessSecret,
          { expiresIn: accessExpiresIn as jwt.SignOptions['expiresIn'] }
        );

        return res.status(200).json({
          accessToken: newAccessToken,
        });
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(500).json({ error: 'Internal server error during token refresh' });
    }
  }

  static async logout(req: Request, res: Response) {
    // In a stateless JWT architecture, the client discards tokens on logout.
    // We can simply return a success message.
    return res.status(200).json({ message: 'Logout successful' });
  }
}
