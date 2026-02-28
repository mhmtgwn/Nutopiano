import { Module } from '@nestjs/common';
import { ConfigSnapshotService } from './config-snapshot.service';
import { ConfigSnapshotController } from './config-snapshot.controller';

@Module({
    controllers: [ConfigSnapshotController],
    providers: [ConfigSnapshotService],
    exports: [ConfigSnapshotService],
})
export class ConfigSnapshotModule { }
