import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { PkService } from './pk.service';
import { PkRoomStore } from './pk-room.store';

type PkClient = WebSocket & { userId?: string; roomId?: string };

interface AnswerPayload {
  roomId: string;
  questionIndex: number;
  correct: boolean;
}

/** 原生 WebSocket 房间网关：Web 与小程序均用同一 JSON 协议（PK-005）。 */
@Injectable()
export class PkGateway implements OnApplicationBootstrap {
  private readonly logger = new Logger(PkGateway.name);
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, PkClient[]>(); // roomId -> sockets

  constructor(
    private readonly pk: PkService,
    private readonly store: PkRoomStore,
    private readonly host: HttpAdapterHost,
  ) {}

  onApplicationBootstrap() {
    const http = this.host.httpAdapter.getHttpServer() as Server;
    if (!http) return;
    this.wss = new WebSocketServer({ server: http, path: '/ws/pk' });
    this.wss.on('connection', (raw) => this.handleConnection(raw as PkClient));
    this.logger.log('PK WebSocket gateway mounted at /ws/pk');
  }

  private handleConnection(client: PkClient) {
    const url = new URL(client.url ?? '', 'ws://localhost');
    const userId = url.searchParams.get('userId');
    if (!userId) {
      client.close(4001, 'missing userId');
      return;
    }
    client.userId = userId;
    client.on('message', (data) => this.onMessage(client, data.toString()));
  }

  private async onMessage(client: PkClient, raw: string) {
    let msg: { event: string; data?: Record<string, unknown> };
    try {
      msg = JSON.parse(raw) as { event: string; data?: Record<string, unknown> };
    } catch {
      return;
    }
    const data = (msg.data ?? {}) as Record<string, any>;
    try {
      switch (msg.event) {
        case 'join_room':
          this.onJoin(client, data.roomId as string);
          break;
        case 'start_game':
          await this.onStart(data.roomId as string);
          break;
        case 'answer':
          await this.onAnswer(client, data as unknown as AnswerPayload);
          break;
        case 'next_question':
          await this.onNext(data.roomId as string);
          break;
        case 'ping':
          this.send(client, 'pong', {});
          break;
        default:
          break;
      }
    } catch (e) {
      this.broadcast(client.roomId ?? '', 'error', { message: (e as Error).message });
    }
  }

  private onJoin(client: PkClient, roomId: string) {
    if (!roomId) return;
    client.roomId = roomId;
    const arr = this.clients.get(roomId) ?? [];
    arr.push(client);
    this.clients.set(roomId, arr);
    const room = this.store.get(roomId);
    if (room) this.broadcast(roomId, 'room_state', this.store.snapshot(room));
  }

  private async onStart(roomId: string) {
    const q = await this.pk.startGame(roomId);
    this.broadcast(roomId, 'question', q);
  }

  private async onAnswer(client: PkClient, payload: AnswerPayload) {
    if (!client.userId || !payload?.roomId) return;
    const { points, score } = await this.pk.answer(client.userId, payload.roomId, payload.questionIndex, payload.correct);
    this.broadcast(payload.roomId, 'progress', {
      userId: client.userId,
      questionIndex: payload.questionIndex,
      correct: payload.correct,
      score,
      points,
    });
  }

  private async onNext(roomId: string) {
    const q = await this.pk.nextQuestion(roomId);
    if (q) {
      this.broadcast(roomId, 'question', q);
    } else {
      for (const p of this.store.get(roomId)?.players ?? []) {
        const result = await this.pk.resultFor(roomId, p.userId);
        this.sendTo(roomId, p.userId, 'result', result);
      }
    }
  }

  private send(client: PkClient, event: string, data: unknown) {
    if (client.readyState === 1) client.send(JSON.stringify({ event, data }));
  }

  private broadcast(roomId: string, event: string, data: unknown) {
    const arr = this.clients.get(roomId) ?? [];
    const payload = JSON.stringify({ event, data });
    arr.forEach((c) => c.readyState === 1 && c.send(payload));
  }

  private sendTo(roomId: string, userId: string, event: string, data: unknown) {
    const arr = this.clients.get(roomId) ?? [];
    const payload = JSON.stringify({ event, data });
    arr.forEach((c) => c.userId === userId && c.readyState === 1 && c.send(payload));
  }
}