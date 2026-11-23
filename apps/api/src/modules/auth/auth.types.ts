/** The authenticated user: `@CurrentUser()` over HTTP, `socket.data` over WebSocket. */
export interface AuthUser {
  userId: string;
  username: string;
  /** The session the request or socket authenticated with (see SessionStore). */
  sessionId: string;
}
