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

/** Starting and ending a match are REST; everything during it goes over WebSocket. */
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

  /** HIDING/ACTIVE -> FINISHED with no winner. Host only. */
  @Post(':id/end')
  @HttpCode(200)
  end(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MatchDto> {
    return this.lifecycle.end(id, user.userId);
  }
}
