import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiAskDto } from '@app/shared';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiAssistantController {
  constructor(private readonly ai: AiAssistantService) {}

  @Get('quota')
  async quota(@CurrentUser() user: { id: string }) {
    return this.ai.getQuota(user.id);
  }

  @Post('ask')
  async ask(@CurrentUser() user: { id: string }, @Body() body: AiAskDto) {
    return this.ai.ask(user.id, body);
  }
}