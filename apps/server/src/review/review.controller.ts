import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('review')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  @Get('today')
  async today(@CurrentUser() user: { id: string }) {
    return this.review.getTodayReview(user.id);
  }

  @Get('vocab')
  async listVocab(@CurrentUser() user: { id: string }) {
    const items = await this.review.listVocab(user.id);
    return {
      items: items.map((v) => ({
        id: v.id,
        word: v.word,
        status: v.status,
        dueAt: v.dueAt.toISOString(),
        interval: v.interval,
        reps: v.reps,
      })),
    };
  }

  @Post('vocab')
  async addVocab(@CurrentUser() user: { id: string }, @Body() body: { word: string }) {
    const v = await this.review.addVocab(user.id, body.word);
    return { id: v.id, word: v.word, status: v.status };
  }

  @Delete('vocab/:id')
  @Post('vocab/:id/delete')
  async removeVocab(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.review.removeVocab(user.id, id);
  }

  @Post('vocab/:id/master')
  async markMastered(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.review.markMastered(user.id, id);
  }

  @Post('vocab/:id/unmaster')
  async unmarkMastered(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.review.unmarkMastered(user.id, id);
  }
}
