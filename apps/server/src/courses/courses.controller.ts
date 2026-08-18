import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { ListCoursePacksDto } from './dto/courses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('course-packs')
  async list(@Query() q: ListCoursePacksDto) {
    return this.courses.list({
      level: q.level,
      q: q.q,
      page: q.page,
      pageSize: q.pageSize,
    });
  }

  @Get('course-packs/:id')
  async detail(@Param('id') id: string) {
    return this.courses.detail(id);
  }

  @Get('courses/:id')
  @UseGuards(JwtAuthGuard)
  async courseSentences(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.courses.getCourseSentences(id, user.id);
  }

  @Post('course-packs/:id/join')
  @UseGuards(JwtAuthGuard)
  async join(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.courses.join(id, user.id);
  }

  @Get('course-packs/:id/detail')
  @UseGuards(JwtAuthGuard)
  async detailAuthed(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.courses.detail(id, user.id);
  }

  @Post('courses/:id/progress')
  @UseGuards(JwtAuthGuard)
  async saveProgress(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { mode: string; sentenceOrder: number; completed: boolean },
  ) {
    return this.courses.saveProgress(user.id, id, body.mode, body.sentenceOrder, body.completed);
  }
}
