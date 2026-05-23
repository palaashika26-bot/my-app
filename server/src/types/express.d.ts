// Augment Express Request to carry the authenticated user payload
declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      role: string;
    };
  }
}
