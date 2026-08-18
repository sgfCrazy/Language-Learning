import { Module } from '@nestjs/common';
import { PkController } from './pk.controller';
import { PkService } from './pk.service';
import { PkRoomStore } from './pk-room.store';
import { PkGateway } from './pk.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PkController],
  providers: [PkService, PkRoomStore, PkGateway],
  exports: [PkService, PkRoomStore],
})
export class PkModule {}