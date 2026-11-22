export * from './enums.js';
export * from './auth.js';
export * from './match.js';
export * from './events.js';

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}
