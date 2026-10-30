import type { AuthApi, LoginInput, RegisterInput } from './auth-api';
import type { AuthTokens, SessionState, SessionStorage } from './session-types';

export class SessionManager {
  private tokens: AuthTokens | null = null;
  private generation = 0;

  constructor(
    private readonly storage: SessionStorage,
    private readonly authApi: AuthApi,
  ) {}

  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  async bootstrap(): Promise<SessionState> {
    try {
      const stored = await this.storage.load();
      if (!stored) return { status: 'unauthenticated' };
      this.tokens = stored;
      const token = await this.refresh();
      return token && this.tokens
        ? { status: 'authenticated', tokens: this.tokens }
        : { status: 'unauthenticated' };
    } catch {
      await this.clear();
      return { status: 'unauthenticated' };
    }
  }

  async login(input: LoginInput): Promise<SessionState> {
    return this.save(await this.authApi.login(input));
  }

  async register(input: RegisterInput): Promise<SessionState> {
    return this.save(await this.authApi.register(input));
  }

  async refresh(): Promise<string | null> {
    if (!this.tokens?.refreshToken) return null;
    const generation = this.generation;
    try {
      const tokens = await this.authApi.refresh(this.tokens.refreshToken);
      if (generation !== this.generation) return null;
      await this.save(tokens);
      return tokens.accessToken;
    } catch {
      if (generation === this.generation) await this.clear();
      return null;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this.tokens?.refreshToken;
    this.generation += 1;
    this.tokens = null;
    try {
      if (refreshToken) await this.authApi.logout(refreshToken);
    } finally {
      await this.clear();
    }
  }

  async logoutAll(): Promise<void> {
    const accessToken = this.tokens?.accessToken;
    this.generation += 1;
    this.tokens = null;
    try {
      if (!accessToken) throw new Error('No hay una sesión activa para cerrar los demás dispositivos.');
      await this.authApi.logoutAll(accessToken);
    } finally {
      await this.clear();
    }
  }

  private async save(tokens: AuthTokens): Promise<SessionState> {
    this.tokens = tokens;
    await this.storage.save(tokens);
    return { status: 'authenticated', tokens };
  }

  private async clear(): Promise<void> {
    this.tokens = null;
    await this.storage.clear();
  }
}
