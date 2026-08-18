import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateSpeaking, type SpeakingResult } from '@app/shared';

/** 服务端按句子文本合成轻量 WAV（开发期媒体占位）。 */
function synthWav(text: string): Buffer {
  const words = text.trim().split(/\s+/);
  const beepCount = Math.max(1, words.length);
  const sampleRate = 8000;
  const perBeep = sampleRate * 0.35;
  const totalSamples = beepCount * perBeep;
  const data = Buffer.alloc(44 + totalSamples * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + totalSamples * 2, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(totalSamples * 2, 40);

  let offset = 44;
  for (let b = 0; b < beepCount; b++) {
    const freq = 300 + (b % 4) * 120;
    for (let i = 0; i < perBeep; i++) {
      const t = i / sampleRate;
      const env = Math.min(1, (i / (sampleRate * 0.02)) * 1) * Math.min(1, ((perBeep - i) / (sampleRate * 0.05)) * 1);
      const sample = Math.round(Math.sin(2 * Math.PI * freq * t) * 0.5 * 32767 * env);
      data.writeInt16LE(sample, offset);
      offset += 2;
    }
  }
  return data;
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  /** 返回某句的 WAV Buffer 与 Content-Type */
  async getSentenceWav(sentenceId: string): Promise<Buffer> {
    const sentence = await this.prisma.sentence.findUnique({ where: { id: sentenceId } });
    if (!sentence) throw new NotFoundException('sentence not found');
    return synthWav(sentence.text);
  }

  /** 口语评分：配置 SPEECH_API_KEY 时接第三方，否则确定性桩 */
  async scoreSpeech(sentenceText: string, durationMs: number, apiKey?: string): Promise<SpeakingResult> {
    if (apiKey) {
      // TODO(prod): 调用第三方语音评测 API（如腾讯云/讯飞）。
    }
    return evaluateSpeaking(sentenceText, durationMs);
  }
}