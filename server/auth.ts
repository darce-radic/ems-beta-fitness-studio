import { Request, Response, NextFunction } from 'express';

// Simple authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // For now, just pass through - in a real app this would verify JWT tokens
  // The frontend is handling Auth0 authentication
  next();
}

export default { requireAuth };