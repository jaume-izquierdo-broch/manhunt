import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  type MatchDto,
  type StartMatchInput,
  startMatchSchema,
} from '@manhunt/types';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MatchLifecycleService } from './match-lifecycle.service.js';

/** The only REST action of a live match is starting it; the rest goes over WebSocket. */
@Controller('matches')
export class LiveMatchController {
  constructor(private readonly lifecycle: MatchLifecycleService) {}

  /** LOBBY -> HIDING. Host only; the body is the host's position, the area's center. */
  @Post(':id/start')
  @HttpCode(200)
  start(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(startMatchSchema)) body: StartMatchInput,
  ): Promise<MatchDto> {
    return this.lifecycle.start(id, user.userId, body);
  }
}
