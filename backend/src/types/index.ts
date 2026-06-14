import { Request } from 'express';
import { Role } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}
