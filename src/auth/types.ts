import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    worldId?: string;
    provider?: string;
    providerUserId?: string;
  };
}
