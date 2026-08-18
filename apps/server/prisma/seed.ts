/**
 * Seed script: 灌入 2 个课程包 × 各 2 课程 × 各 8 句（含拆解词块）。
 * 运行: pnpm -F @app/server seed
 */
import { PrismaClient } from '@prisma/client';
import { tokenize } from '@app/shared';

const prisma = new PrismaClient();

interface SeedSentence {
  text: string;
  translation: string;
}

const COURSE_PACKS: Array<{
  title: string;
  description: string;
  level: string;
  tags: string[];
  courses: Array<{
    title: string;
    type: string;
    sentences: SeedSentence[];
  }>;
}> = [
  {
    title: '日常英语入门',
    description: '围绕日常生活的高频句子，适合零基础与初学者。',
    level: 'beginner',
    tags: ['日常', '入门'],
    courses: [
      {
        title: '打招呼',
        type: 'text',
        sentences: [
          { text: 'Hello, how are you?', translation: '你好，你怎么样？' },
          { text: "I'm fine, thank you.", translation: '我很好，谢谢。' },
          { text: 'Nice to meet you.', translation: '很高兴认识你。' },
          { text: 'See you tomorrow.', translation: '明天见。' },
          { text: 'Have a nice day!', translation: '祝你有美好的一天！' },
          { text: "What's your name?", translation: '你叫什么名字？' },
          { text: 'My name is Tom.', translation: '我的名字叫汤姆。' },
          { text: 'Good morning, everyone.', translation: '大家早上好。' },
        ],
      },
      {
        title: '点餐',
        type: 'text',
        sentences: [
          { text: 'I would like a coffee.', translation: '我想要一杯咖啡。' },
          { text: "Can I have the menu?", translation: '能给我菜单吗？' },
          { text: 'This is delicious.', translation: '这个很好吃。' },
          { text: 'The bill, please.', translation: '请结账。' },
          { text: "I don't like spicy food.", translation: '我不喜欢辣的食物。' },
          { text: 'Water is fine for me.', translation: '我喝水就好。' },
          { text: 'Do you have vegetarian dishes?', translation: '你们有素食吗？' },
          { text: "I'll take this one.", translation: '我要这个。' },
        ],
      },
    ],
  },
  {
    title: 'PTE 核心句型',
    description: 'PTE 考试常见句型与表达，适合备考强化。',
    level: 'intermediate',
    tags: ['PTE', '备考'],
    courses: [
      {
        title: '高频学术句',
        type: 'text',
        sentences: [
          { text: 'The results indicate a significant trend.', translation: '结果表明一个显著趋势。' },
          { text: 'This study focuses on climate change.', translation: '本研究聚焦气候变化。' },
          { text: 'Researchers analyzed the data carefully.', translation: '研究人员仔细分析了数据。' },
          { text: 'The conclusion remains controversial.', translation: '该结论仍有争议。' },
          { text: "It's essential to consider the context.", translation: '必须考虑语境。' },
          { text: 'The findings support our hypothesis.', translation: '发现支持我们的假设。' },
          { text: 'Further research is required.', translation: '需要进一步研究。' },
          { text: 'These factors influence the outcome.', translation: '这些因素影响结果。' },
        ],
      },
      {
        title: '描述图表',
        type: 'text',
        sentences: [
          { text: 'The chart shows a steady increase.', translation: '图表显示稳定增长。' },
          { text: 'There was a sharp drop in 2020.', translation: '2020 年出现急剧下降。' },
          { text: 'The figures remain stable over time.', translation: '数据随时间保持稳定。' },
          { text: 'A peak appears in the third quarter.', translation: '峰值出现在第三季度。' },
          { text: 'The trend reversed dramatically.', translation: '趋势急剧逆转。' },
          { text: 'Comparing the two groups is instructive.', translation: '比较两组很有启发。' },
          { text: 'The proportion reached fifty percent.', translation: '比例达到百分之五十。' },
          { text: 'No significant difference was observed.', translation: '未观察到显著差异。' },
        ],
      },
    ],
  },
];

async function main(): Promise<void> {
  // 清空已有内容（开发期幂等）
  await prisma.practiceRecord.deleteMany();
  await prisma.courseProgress.deleteMany();
  await prisma.userVocab.deleteMany();
  await prisma.userCoursePack.deleteMany();
  await prisma.sentence.deleteMany();
  await prisma.course.deleteMany();
  await prisma.coursePack.deleteMany();

  for (let p = 0; p < COURSE_PACKS.length; p++) {
    const pack = COURSE_PACKS[p]!;
    const packRec = await prisma.coursePack.create({
      data: {
        title: pack.title,
        description: pack.description,
        level: pack.level,
        tags: pack.tags.join(','),
        coverUrl: '',
      },
    });

    for (let c = 0; c < pack.courses.length; c++) {
      const course = pack.courses[c]!;
      const courseRec = await prisma.course.create({
        data: {
          coursePackId: packRec.id,
          title: course.title,
          type: course.type,
          order: c,
        },
      });

      for (let s = 0; s < course.sentences.length; s++) {
        const sent = course.sentences[s]!;
        const tokens = tokenize(sent.text);
        await prisma.sentence.create({
          data: {
            courseId: courseRec.id,
            order: s,
            text: sent.text,
            translation: sent.translation,
            tokens: JSON.stringify(tokens),
          },
        });
      }
    }
  }

  const counts = {
    packs: await prisma.coursePack.count(),
    courses: await prisma.course.count(),
    sentences: await prisma.sentence.count(),
  };
  // eslint-disable-next-line no-console
  console.log('Seed done:', counts);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
