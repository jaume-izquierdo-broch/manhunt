import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { MatchDto } from '@manhunt/types';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MatchReader } from './match-reader.service.js';

const uuid = new ParseUUIDPipe();

/** Reading a match, whatever its status. `POST /matches/:id/start` lives in `live-match`. */
@Controller('matches')
export class MatchesController {
  constructor(private readonly reader: MatchReader) {}

  /** The user's unfinished match, or `match: null`. Lets the app resume after a restart. */
  @Get('current')
  async current(
    @CurrentUser() user: AuthUser,
  ): Promise<{ match: MatchDto | null }> {
    return { match: await this.reader.getOpenDtoForUser(user.userId) };
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<MatchDto> {
    return this.reader.getDtoForMember(id, user.userId);
  }
}
