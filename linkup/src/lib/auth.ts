import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface HostTokenPayload {
  roomId: string;
  role: 'host';
}

export function generateHostToken(roomId: string): string {
  const payload: HostTokenPayload = { roomId, role: 'host' };
  // Expire host token in 24 hours to match standard room lifetime limits
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyHostToken(token: string): HostTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as HostTokenPayload;
  } catch {
    return null;
  }
}
