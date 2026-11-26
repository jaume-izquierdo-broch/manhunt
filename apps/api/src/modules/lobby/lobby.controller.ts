import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  type JoinLobbyInput,
  joinLobbySchema,
  type MatchDto,
  type MatchSettings,
  matchSettingsSchema,
  type SetTeamInput,
  setTeamSchema,
} from '@manhunt/types';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { LobbyService } from './lobby.service.js';

const uuid = new ParseUUIDPipe();

/**
 * The lobby: where players gather before the match. A lobby is a match in the
 * LOBBY status, so its id is the match id.
 */
@Controller('lobbies')
export class LobbyController {
  constructor(private readonly lobby: LobbyService) {}

  /** Settings are optional: the host can change them later in the lobby. */
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(matchSettingsSchema)) body: MatchSettings,
  ): Promise<MatchDto> {
    return this.lobby.create(user.userId, body);
  }

  @Post('join')
  @HttpCode(200)
  join(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(joinLobbySchema)) body: JoinLobbyInput,
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
  @Patch(':id/settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(matchSettingsSchema)) body: MatchSettings,
  ): Promise<MatchDto> {
    return this.lobby.updateSettings(id, user.userId, body);
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
