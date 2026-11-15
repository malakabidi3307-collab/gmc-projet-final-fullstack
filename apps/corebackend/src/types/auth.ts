export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  /** Fin de vie absolue de la session (et du refresh token). */
  expiresAt: Date;
}