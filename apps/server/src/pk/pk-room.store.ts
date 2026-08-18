import { Injectable } from '@nestjs/common';
import {
  PkPlayer,
  PkQuestion,
  PkRoomMode,
  PkRoomStatus,
  PkRoomSnapshot,
  genPkCode,
} from '@app/shared';

export interface PkRoom {
  roomId: string;
  code?: string;
  mode: PkRoomMode;
  status: PkRoomStatus;
  coursePackId?: string;
  questionCount: number;
  timeLimitMs: number;
  questions: PkQuestion[];
  players: PkPlayer[];
  scores: Record<string, number>;
  correctCounts: Record<string, number>;
  questionIndex: number;
  answerOrders: number;
  winnerId: string | null;
  createdAt: number;
}

export interface MatchTicket {
  ticketId: string;
  userId: string;
  createdAt: number;
}

/** 进程内房间与匹配队列（单实例开发用，生产迁 Redis） */
@Injectable()
export class PkRoomStore {
  private rooms = new Map<string, PkRoom>();
  private queue: MatchTicket[] = [];
  private ticketSeq = 0;

  createRoom(opts: {
    mode: PkRoomMode;
    coursePackId?: string;
    questionCount: number;
    timeLimitMs: number;
    questions: PkQuestion[];
    creator: PkPlayer;
  }): PkRoom {
    const roomId = `pk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const room: PkRoom = {
      roomId,
      code: opts.mode === 'private' ? genPkCode() : undefined,
      mode: opts.mode,
      status: 'waiting',
      coursePackId: opts.coursePackId,
      questionCount: opts.questionCount,
      timeLimitMs: opts.timeLimitMs,
      questions: opts.questions,
      players: [opts.creator],
      scores: { [opts.creator.userId]: 0 },
      correctCounts: { [opts.creator.userId]: 0 },
      questionIndex: 0,
      answerOrders: 0,
      winnerId: null,
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  get(roomId: string): PkRoom | undefined {
    return this.rooms.get(roomId);
  }

  join(roomId: string, player: PkPlayer): PkRoom {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.status !== 'waiting') throw new Error('ROOM_NOT_JOINABLE');
    if (room.players.length >= 2) throw new Error('ROOM_FULL');
    room.players.push(player);
    room.scores[player.userId] = 0;
    room.correctCounts[player.userId] = 0;
    room.status = 'ready';
    return room;
  }

  findByCode(code: string): PkRoom | undefined {
    return [...this.rooms.values()].find((r) => r.code === code && r.status === 'waiting');
  }

  listPublic(): PkRoomSnapshot[] {
    return [...this.rooms.values()]
      .filter((r) => r.mode === 'public' && r.status === 'waiting')
      .map((r) => this.snapshot(r));
  }

  remove(roomId: string) {
    this.rooms.delete(roomId);
  }

  enqueue(ticket: MatchTicket) {
    this.queue.push(ticket);
  }

  dequeue(userId: string): MatchTicket | undefined {
    const i = this.queue.findIndex((t) => t.userId === userId);
    if (i === -1) return undefined;
    return this.queue.splice(i, 1)[0];
  }

  /** 尝试为排队者找对手；命中则返回双方 ticket 并从队列移除 */
  pair(): [MatchTicket, MatchTicket] | null {
    if (this.queue.length < 2) return null;
    const a = this.queue.shift()!;
    const b = this.queue.shift()!;
    return [a, b];
  }

  snapshot(room: PkRoom): PkRoomSnapshot {
    return {
      roomId: room.roomId,
      code: room.code,
      mode: room.mode,
      status: room.status,
      questionCount: room.questionCount,
      coursePackId: room.coursePackId,
      players: room.players,
    };
  }
}