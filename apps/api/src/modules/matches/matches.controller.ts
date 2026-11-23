import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  type CreateMatchInput,
  createMatchSchema,
  type JoinMatchInput,
  joinMatchSchema,
  type MatchDto,
  type SetTeamInput,
  setTeamSchema,
} from '@manhunt/types';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { LobbyService } from './lobby.service.js';
import { MatchReader } from './match-reader.service.js';

const uuid = new ParseUUIDPipe();

/** Match queries and lobby management. `POST /matches/:id/start` lives in the `game` module. */
@Controller('matches')
export class MatchesController {
  constructor(
    private readonly lobby: LobbyService,
    private readonly reader: MatchReader,
  ) {}

  // --- Queries -------------------------------------------------------------

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

  // --- Lobby ---------------------------------------------------------------

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createMatchSchema)) body: CreateMatchInput,
  ): Promise<MatchDto> {
    return this.lobby.create(user.userId, body);
  }

  @Post('join')
  @HttpCode(200)
  join(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(joinMatchSchema)) body: JoinMatchInput,
  ): Promise<MatchDto> {
    return this.lobby.join(user.userId, body.joinCode);
  }

  @Post(':id/leave')
  @HttpCode(204)
  leave(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<void> {
    return this.lobby.leave(id, user.userId);
  }

  /** Host only. */
  @Delete(':id')
  @HttpCode(204)
  close(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<void> {
    return this.lobby.close(id, user.userId);
  }

  /** Host only. */
  @Patch(':id/players/:userId')
  setTeam(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('userId', uuid) targetId: string,
    @Body(new ZodValidationPipe(setTeamSchema)) body: SetTeamInput,
  ): Promise<MatchDto> {
    return this.lobby.setTeam(id, user.userId, targetId, body.team);
  }

  /** Host only. */
  @Delete(':id/players/:userId')
  kick(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('userId', uuid) targetId: string,
  ): Promise<MatchDto> {
    return this.lobby.kick(id, user.userId, targetId);
  }
}
