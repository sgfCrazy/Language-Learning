import { BadRequestException, Body, Controller, Get, Header, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

interface SpeechScoreDto {
  sentenceText: string;
  durationMs: number;
}

@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly config: ConfigService,
  ) {}

  @Get('audio/:sentenceId')
  @Header('Content-Type', 'audio/wav')
  async audio(@Param('sentenceId') sentenceId: string, @Res() res: Response) {
    const wav = await this.media.getSentenceWav(sentenceId);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(wav);
  }

  @Post('speech-score')
  @UseGuards(JwtAuthGuard)
  async speechScore(@CurrentUser() _user: { id: string }, @Body() body: SpeechScoreDto) {
    if (!body?.sentenceText?.trim()) throw new BadRequestException('sentenceText 不能为空');
    const apiKey = this.config.get<string>('SPEECH_API_KEY') ?? '';
    return this.media.scoreSpeech(body.sentenceText.trim(), Number(body.durationMs) || 0, apiKey);
  }
}