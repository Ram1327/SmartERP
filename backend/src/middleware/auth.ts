import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

// Extend Express Request type locally
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  companyId?: string;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET || 'smarterp_access_secret_key_1327_super_secure_3c9284cfb';

  jwt.verify(token, accessSecret, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };
    next();
  });
};

export const requireCompanyContext = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const companyId = req.headers['x-company-id'] as string;

  if (!companyId) {
    return res.status(400).json({ error: 'Company context (x-company-id header) is required' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'User must be authenticated' });
  }

  try {
    // Verify company exists and belongs to the authenticated user
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId: req.user.id,
      },
    });

    if (!company) {
      return res.status(403).json({ error: 'Access denied: Active company not found or does not belong to user' });
    }

    req.companyId = companyId;
    next();
  } catch (error) {
    console.error('Error verifying company context:', error);
    res.status(500).json({ error: 'Internal server error verifying company' });
  }
};
