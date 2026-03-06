import {
    ForbiddenException,
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
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/constants/permissions';
import { PermissionGroupService } from './permission-group.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { parseBusinessId } from '../../common/utils';

@Controller('permission-groups')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class PermissionGroupController {
    constructor(private readonly service: PermissionGroupService) { }

    private getScopedBusinessId(req: { user?: JwtPayload }): number {
        const businessId = parseBusinessId(req.user?.businessId);
        if (!businessId) {
            throw new ForbiddenException('Business context bulunamadi');
        }
        return businessId;
    }

    @Get()
    @RequirePermissions(Permission.USERS_VIEW)
    findAll(@Req() req: { user: JwtPayload }) {
        return this.service.findAll(this.getScopedBusinessId(req));
    }

    @Get(':id')
    @RequirePermissions(Permission.USERS_VIEW)
    findOne(
        @Req() req: { user: JwtPayload },
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.service.findOne(id, this.getScopedBusinessId(req));
    }

    @Post()
    @RequirePermissions(Permission.USERS_EDIT)
    create(
        @Req() req: { user: JwtPayload },
        @Body()
        body: {
            name: string;
            description?: string;
            permissions: Permission[];
        },
    ) {
        return this.service.create(this.getScopedBusinessId(req), {
            name: body.name,
            description: body.description,
            permissions: body.permissions,
        });
    }

    @Put(':id')
    @RequirePermissions(Permission.USERS_EDIT)
    update(
        @Req() req: { user: JwtPayload },
        @Param('id', ParseIntPipe) id: number,
        @Body()
        body: {
            name?: string;
            description?: string;
            permissions?: Permission[];
            isActive?: boolean;
        },
    ) {
        return this.service.update(id, this.getScopedBusinessId(req), {
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
        @Req() req: { user: JwtPayload },
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.service.delete(id, this.getScopedBusinessId(req));
    }

    @Post('users/:userId/assign')
    @RequirePermissions(Permission.USERS_EDIT)
    assignToUser(
        @Req() req: { user: JwtPayload },
        @Param('userId', ParseIntPipe) userId: number,
        @Body()
        body: { permissionGroupId: number },
    ) {
        return this.service.assignToUser(
            userId,
            body.permissionGroupId,
            this.getScopedBusinessId(req),
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
    seedPresets(@Req() req: { user: JwtPayload }) {
        return this.service.seedPresets(this.getScopedBusinessId(req));
    }
}
