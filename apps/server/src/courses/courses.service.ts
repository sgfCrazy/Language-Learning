import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CourseLevel, CoursePackDto, CourseDto, SentenceDto, TokenDto } from '@app/shared';

function toLevel(s: string): CourseLevel {
  return (['beginner', 'intermediate', 'advanced'].includes(s)
    ? s
    : 'beginner') as CourseLevel;
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { level?: string; q?: string; page?: number; pageSize?: number; userId?: string }) {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const where: { level?: string; OR?: Array<{ title?: { contains: string }; description?: { contains: string } }> } = {};
    if (params.level) where.level = params.level;
    if (params.q) {
      where.OR = [
        { title: { contains: params.q } },
        { description: { contains: params.q } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.coursePack.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coursePack.count({ where }),
    ]);

    let joinedSet: Set<string> | null = null;
    if (params.userId) {
      const mem = await this.prisma.userCoursePack.findMany({
        where: { userId: params.userId },
        select: { coursePackId: true },
      });
      joinedSet = new Set(mem.map((m) => m.coursePackId));
    }

    const dtos: CoursePackDto[] = items.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      coverUrl: p.coverUrl,
      level: toLevel(p.level),
      tags: p.tags ? p.tags.split(',').filter(Boolean) : [],
      joined: joinedSet ? joinedSet.has(p.id) : undefined,
    }));

    return { items: dtos, total, page, pageSize };
  }

  async detail(coursePackId: string, userId?: string) {
    const pack = await this.prisma.coursePack.findUnique({ where: { id: coursePackId } });
    if (!pack) throw new NotFoundException('course pack not found');
    const courses = await this.prisma.course.findMany({
      where: { coursePackId },
      orderBy: { order: 'asc' },
    });
    const sentenceCounts = await Promise.all(
      courses.map((c) =>
        this.prisma.sentence.count({ where: { courseId: c.id } }),
      ),
    );

    let progressMap = new Map<string, number>();
    let joined = false;
    if (userId) {
      const mem = await this.prisma.userCoursePack.findUnique({
        where: { userId_coursePackId: { userId, coursePackId } },
      });
      joined = !!mem;
      const prog = await this.prisma.courseProgress.findMany({
        where: { userId, courseId: { in: courses.map((c) => c.id) } },
      });
      for (const p of prog) {
        const total = sentenceCounts[courses.findIndex((c) => c.id === p.courseId)] ?? 0;
        progressMap.set(p.courseId, total ? Math.round((p.sentenceOrder / total) * 100) : 0);
      }
    }

    const courseDtos: CourseDto[] = courses.map((c, i) => ({
      id: c.id,
      coursePackId,
      title: c.title,
      type: c.type as CourseDto['type'],
      sentenceCount: sentenceCounts[i] ?? 0,
      userProgress: progressMap.get(c.id),
    }));

    return {
      id: pack.id,
      title: pack.title,
      description: pack.description,
      coverUrl: pack.coverUrl,
      level: toLevel(pack.level),
      tags: pack.tags ? pack.tags.split(',').filter(Boolean) : [],
      joined,
      courses: courseDtos,
    };
  }

  async join(coursePackId: string, userId: string) {
    const pack = await this.prisma.coursePack.findUnique({ where: { id: coursePackId } });
    if (!pack) throw new NotFoundException('course pack not found');
    await this.prisma.userCoursePack.upsert({
      where: { userId_coursePackId: { userId, coursePackId } },
      create: { userId, coursePackId },
      update: {},
    });
    // 初始化各课程进度为起始位置
    const courses = await this.prisma.course.findMany({ where: { coursePackId }, orderBy: { order: 'asc' } });
    for (const c of courses) {
      await this.prisma.courseProgress.upsert({
        where: { userId_courseId: { userId, courseId: c.id } },
        create: { userId, courseId: c.id, mode: 'zh_to_en', sentenceOrder: 0 },
        update: {},
      });
    }
    return { status: 'ok' as const };
  }

  async getCourseSentences(courseId: string, userId?: string): Promise<{ sentences: SentenceDto[]; progress?: { sentenceOrder: number; mode: string } }> {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('course not found');
    const sentences = await this.prisma.sentence.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
    const dtos: SentenceDto[] = sentences.map((s) => ({
      id: s.id,
      courseId,
      order: s.order,
      text: s.text,
      translation: s.translation,
      tokens: JSON.parse(s.tokens) as TokenDto[],
      mediaUrl: s.mediaUrl,
      startMs: s.startMs,
      endMs: s.endMs,
    }));
    let progress: { sentenceOrder: number; mode: string } | undefined;
    if (userId) {
      const p = await this.prisma.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId } } });
      if (p) progress = { sentenceOrder: p.sentenceOrder, mode: p.mode };
    }
    return { sentences: dtos, progress };
  }

  async saveProgress(userId: string, courseId: string, mode: string, sentenceOrder: number, completed: boolean) {
    await this.prisma.courseProgress.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, mode, sentenceOrder, completed },
      update: { mode, sentenceOrder, completed, updatedAt: new Date() },
    });
    return { status: 'ok' as const };
  }
}
