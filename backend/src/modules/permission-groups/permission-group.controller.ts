import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/constants/permissions';
import { PermissionGroupService } from './permission-group.service';

@Controller('permission-groups')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class PermissionGroupController {
    constructor(private readonly service: PermissionGroupService) { }

    @Get()
    @RequirePermissions(Permission.USERS_VIEW)
    findAll(@Body() body: { businessId?: number }, @Param() _: unknown) {
        // businessId JWT'den alınacak — şimdilik body'den
        return this.service.findAll(body.businessId ?? 1);
    }

    @Get(':id')
    @RequirePermissions(Permission.USERS_VIEW)
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { businessId?: number },
    ) {
        return this.service.findOne(id, body.businessId ?? 1);
    }

    @Post()
    @RequirePermissions(Permission.USERS_EDIT)
    create(
        @Body()
        body: {
            businessId: number;
            name: string;
            description?: string;
            permissions: Permission[];
        },
    ) {
        return this.service.create(body.businessId, {
            name: body.name,
            description: body.description,
            permissions: body.permissions,
        });
    }

    @Put(':id')
    @RequirePermissions(Permission.USERS_EDIT)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body()
        body: {
            businessId: number;
            name?: string;
            description?: string;
            permissions?: Permission[];
            isActive?: boolean;
        },
    ) {
        return this.service.update(id, body.businessId, {
            name: body.name,
            description: body.description,
            permissions: body.permissions,
            isActive: body.isActive,
        });
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequirePermissions(Permission.USERS_EDIT)
    delete(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { businessId: number },
    ) {
        return this.service.delete(id, body.businessId);
    }

    @Post('users/:userId/assign')
    @RequirePermissions(Permission.USERS_EDIT)
    assignToUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Body()
        body: { permissionGroupId: number; businessId: number },
    ) {
        return this.service.assignToUser(
            userId,
            body.permissionGroupId,
            body.businessId,
        );
    }

    @Delete('users/:userId/groups/:groupId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequirePermissions(Permission.USERS_EDIT)
    removeFromUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
    ) {
        return this.service.removeFromUser(userId, groupId);
    }

    @Post('seed')
    @Roles('SUPER_ADMIN')
    seedPresets(@Body() body: { businessId: number }) {
        return this.service.seedPresets(body.businessId);
    }
}
