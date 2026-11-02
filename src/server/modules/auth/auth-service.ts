import { createHash, randomBytes } from 'node:crypto';

export interface AuthUser {
  id: string;
  email: string | null;
  phoneE164: string | null;
  firstName: string;
  paternalSurname: string;
  maternalSurname: string | null;
  isAdmin: boolean;
}
export interface AuthSession { id: string; user: AuthUser }

export interface AuthRepository {
  findActiveUser(identifier: string): Promise<AuthUser | null>;
  createSession(input: { userId: string; tokenHash: string; expiresAt: Date; ip?: string; userAgent?: string }): Promise<void>;
  findActiveSession(tokenHash: string, now: Date): Promise<AuthSession | null>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
}

export class AuthService {
  constructor(private readonly repository: AuthRepository, private readonly clock: () => Date = () => new Date()) {}

  static normalizeIdentifier(input: string): string {
    const identifier = input.trim();
    if (identifier.includes('@')) return identifier.toLocaleLowerCase('es-CL');
    const compact = identifier.replace(/[\s()-]/g, '');
    if (compact.startsWith('+')) return compact;
    if (/^56\d{9}$/.test(compact)) return `+${compact}`;
    if (/^9\d{8}$/.test(compact)) return `+56${compact}`;
    return compact;
  }

  async login(identifierInput: string, request: { ip?: string; userAgent?: string }) {
    const user = await this.repository.findActiveUser(AuthService.normalizeIdentifier(identifierInput));
    if (!user) return null;
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(this.clock().getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.repository.createSession({ userId: user.id, tokenHash, expiresAt, ...request });
    return { user, token, expiresAt };
  }

  getUser(token: string) {
    return this.getSession(token).then((session) => session?.user ?? null);
  }

  getSession(token: string) {
    return this.repository.findActiveSession(createHash('sha256').update(token).digest('hex'), this.clock());
  }

  async logout(token?: string) {
    if (token) await this.repository.revokeSession(createHash('sha256').update(token).digest('hex'), this.clock());
  }
}
