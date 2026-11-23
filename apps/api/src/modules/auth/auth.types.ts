/** The authenticated user: `@CurrentUser()` over HTTP, `socket.data` over WebSocket. */
export interface AuthUser {
  userId: string;
  username: string;
}

/** JWT claims. */
export interface JwtPayload {
  sub: string;
  username: string;
}
