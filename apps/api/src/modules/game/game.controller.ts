import {
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { MatchDto } from '@manhunt/types';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MatchLifecycleService } from './match-lifecycle.service.js';

/** Única acción REST de la partida en juego: empezarla. El resto va por WebSocket. */
@Controller('matches')
export class GameController {
  constructor(private readonly lifecycle: MatchLifecycleService) {}

  /** WAITING -> HIDING (solo el anfitrión). */
  @Post(':id/start')
  @HttpCode(200)
  start(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MatchDto> {
    return this.lifecycle.start(id, user.userId);
  }
}
