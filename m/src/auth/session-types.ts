export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
};

export type SessionState =
  | { status: 'bootstrapping' }
  | { status: 'authenticated'; tokens: AuthTokens }
  | { status: 'unauthenticated' };

export interface SessionStorage {
  load(): Promise<AuthTokens | null>;
  save(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}
