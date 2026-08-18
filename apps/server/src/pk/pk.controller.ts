import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PkService } from './pk.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pk')
@UseGuards(JwtAuthGuard)
export class PkController {
  constructor(private readonly pk: PkService) {}

  @Post('rooms')
  async create(@CurrentUser() user: { id: string }, @Body() body: { mode?: string; coursePackId?: string; questionCount?: number }) {
    const mode = body.mode === 'private' ? 'private' : 'public';
    const u = await this.pk.userInfo(user.id);
    return this.pk.createRoom(u, { mode, coursePackId: body.coursePackId, questionCount: body.questionCount });
  }

  @Get('rooms')
  async list() {
    return { items: this.pk.listRooms() };
  }

  @Post('rooms/:id/join')
  async join(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const u = await this.pk.userInfo(user.id);
    return this.pk.joinRoom(u, id);
  }

  @Post('rooms/code/:code/join')
  async joinByCode(@CurrentUser() user: { id: string }, @Param('code') code: string) {
    const u = await this.pk.userInfo(user.id);
    return this.pk.joinByCode(u, code);
  }

  @Get('rooms/:id')
  async get(@CurrentUser() _user: { id: string }, @Param('id') id: string) {
    return this.pk.getRoom(id);
  }

  @Post('match')
  async match(@CurrentUser() user: { id: string }) {
    const u = await this.pk.userInfo(user.id);
    return this.pk.startMatch(u);
  }

  @Delete('match')
  async cancelMatch(@CurrentUser() user: { id: string }) {
    const u = await this.pk.userInfo(user.id);
    return this.pk.cancelMatch(u);
  }

  @Get('leaderboard')
  async leaderboard(@CurrentUser() _user: { id: string }) {
    return this.pk.leaderboard();
  }

  @Get('rooms/:id/result')
  async result(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.pk.resultFor(id, user.id);
  }
}