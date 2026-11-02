import type { PrismaClient } from '@prisma/client';
import type { AuthRepository, AuthUser } from './auth-service.js';

const publicUser = { id: true, email: true, phoneE164: true, firstName: true, paternalSurname: true, maternalSurname: true, isAdmin: true } as const;

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly database: PrismaClient) {}

  findActiveUser(identifier: string): Promise<AuthUser | null> {
    return this.database.user.findFirst({ where: { isActive: true, OR: [{ email: identifier }, { phoneE164: identifier }] }, select: publicUser });
  }

  async createSession(input: { userId: string; tokenHash: string; expiresAt: Date; ip?: string; userAgent?: string }): Promise<void> {
    await this.database.session.create({ data: input });
  }

  async findActiveSession(tokenHash: string, now: Date) {
    const session = await this.database.session.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now }, user: { isActive: true } },
      select: { id: true, user: { select: publicUser } },
    });
    return session ? { id: session.id, user: session.user } : null;
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.database.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: now } });
  }
}
