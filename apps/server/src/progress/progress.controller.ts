import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Post('records')
  async submit(
    @CurrentUser() user: { id: string },
    @Body() body: {
      courseId: string;
      sentenceId: string;
      mode: string;
      correct: boolean;
      durationMs: number;
      attempts: number;
      score: number;
      clientTimestamp: number;
    },
  ) {
    return this.progress.submitRecord(user.id, body);
  }

  @Get('heatmap')
  async heatmap(@CurrentUser() user: { id: string }) {
    return this.progress.heatmap(user.id);
  }

  @Get('growth')
  async growth(@CurrentUser() user: { id: string }) {
    return this.progress.growth(user.id);
  }

  @Get('courses/:id')
  async courseDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.progress.courseDetail(user.id, id);
  }
}
