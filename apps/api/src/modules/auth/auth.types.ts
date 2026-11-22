/** Usuario autenticado, disponible en HTTP (`@CurrentUser()`) y en el socket (`socket.data`). */
export interface AuthUser {
  userId: string;
  username: string;
}

/** Contenido del JWT. */
export interface JwtPayload {
  sub: string;
  username: string;
}
