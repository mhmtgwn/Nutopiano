import { Module } from '@nestjs/common';
import { PermissionGroupController } from './permission-group.controller';
import { PermissionGroupService } from './permission-group.service';

// DatabaseModule @Global() olduğu için ayrıca import etmeye gerek yok

@Module({
    controllers: [PermissionGroupController],
    providers: [PermissionGroupService],
    exports: [PermissionGroupService],
})
export class PermissionGroupModule { }
