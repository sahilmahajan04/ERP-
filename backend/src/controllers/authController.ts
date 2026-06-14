import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { Role } from '@prisma/client';
import { AuthRequest, UserPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'shiv-furniture-works-super-secret-key-123';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'shiv-furniture-works-refresh-secret-key-456';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role as Role,
      },
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userPayload: UserPayload = { id: user.id, email: user.email, role: user.role };

    // Generate Access Token (15 minutes)
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });

    // Generate Refresh Token (7 days)
    const refreshToken = jwt.sign(userPayload, REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Option to set HttpOnly Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      accessToken,
      refreshToken, // Also returned in JSON for clients that don't support cookies
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken || (req as any).cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid, revoked, or expired refresh token' });
    }

    try {
      jwt.verify(refreshToken, REFRESH_SECRET);
      const userPayload: UserPayload = {
        id: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
      };

      const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
      return res.status(200).json({ accessToken });
    } catch (err) {
      return res.status(403).json({ error: 'Invalid refresh token signature' });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Internal server error during token refresh' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken || (req as any).cookies?.refreshToken;

    if (refreshToken) {
      // Revoke in database
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      });
    }

    res.clearCookie('refreshToken');
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error during logout' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error fetching user profile' });
  }
};
