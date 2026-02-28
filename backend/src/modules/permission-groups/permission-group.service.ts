import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
    Permission,
    ROLE_DEFAULT_PERMISSIONS,
    PRESET_PERMISSION_GROUPS,
} from '../../common/constants/permissions';
import { LEGACY_ROLE_ALIASES } from '../../common/constants/roles';

@Injectable()
export class PermissionGroupService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Kullanıcının aktif yetkilerini çöz.
     * Rol varsayılanları + atanmış yetki grupları birleştirilir.
     */
    async resolveForUser(userId: number): Promise<Permission[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                permissionGroups: {
                    select: {
                        permissionGroup: {
                            select: { permissions: true, isActive: true },
                        },
                    },
                },
            },
        });

        if (!user) return [];

        const rawRole = String(user.role).trim().toUpperCase();
        const normalizedRole = LEGACY_ROLE_ALIASES[rawRole] ?? rawRole;

        // SUPER_ADMIN için tüm yetkiler
        if (normalizedRole === 'SUPER_ADMIN') {
            return Object.values(Permission);
        }

        // Rol varsayılan yetkileri
        const defaultPerms: Permission[] =
            ROLE_DEFAULT_PERMISSIONS[normalizedRole] ?? [];

        // Atanmış yetki grupları (sadece aktif olanlar)
        const groupPerms: Permission[] = user.permissionGroups
            .filter((upg) => upg.permissionGroup.isActive)
            .flatMap((upg) => (upg.permissionGroup.permissions as string[]) as Permission[]);

        // Tekrarları kaldır
        return Array.from(new Set([...defaultPerms, ...groupPerms]));
    }

    // ─── CRUD ───

    async findAll(businessId: number) {
        return this.prisma.permissionGroup.findMany({
            where: { businessId },
            include: {
                _count: { select: { userAssignments: true } },
            },
            orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        });
    }

    async findOne(id: number, businessId: number) {
        return this.prisma.permissionGroup.findFirstOrThrow({
            where: { id, businessId },
            include: {
                _count: { select: { userAssignments: true } },
            },
        });
    }

    async create(businessId: number, data: {
        name: string;
        description?: string;
        permissions: Permission[];
    }) {
        return this.prisma.permissionGroup.create({
            data: {
                businessId,
                name: data.name,
                description: data.description,
                permissions: data.permissions,
                isSystem: false,
                isActive: true,
            },
        });
    }

    async update(id: number, businessId: number, data: {
        name?: string;
        description?: string;
        permissions?: Permission[];
        isActive?: boolean;
    }) {
        // Sistem gruplarına isim/permissions değişikliği izin verilmez
        const existing = await this.prisma.permissionGroup.findFirstOrThrow({
            where: { id, businessId },
        });

        if (existing.isSystem && (data.name || data.permissions)) {
            // İsSystem gruplar için sadece isActive değiştirilebilir
            return this.prisma.permissionGroup.update({
                where: { id },
                data: { isActive: data.isActive },
            });
        }

        return this.prisma.permissionGroup.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                permissions: data.permissions,
                isActive: data.isActive,
            },
        });
    }

    async delete(id: number, businessId: number) {
        const existing = await this.prisma.permissionGroup.findFirstOrThrow({
            where: { id, businessId },
        });

        if (existing.isSystem) {
            throw new Error('Sistem yetki grupları silinemez');
        }

        return this.prisma.permissionGroup.delete({ where: { id } });
    }

    async assignToUser(userId: number, permissionGroupId: number, businessId: number) {
        return this.prisma.userPermissionGroup.create({
            data: { businessId, userId, permissionGroupId },
        });
    }

    async removeFromUser(userId: number, permissionGroupId: number) {
        return this.prisma.userPermissionGroup.delete({
            where: { userId_permissionGroupId: { userId, permissionGroupId } },
        });
    }

    /**
     * İş yeri ilk kurulumunda preset yetki gruplarını seed'le.
     */
    async seedPresets(businessId: number) {
        const presets = Object.values(PRESET_PERMISSION_GROUPS);

        for (const preset of presets) {
            await this.prisma.permissionGroup.upsert({
                where: { businessId_name: { businessId, name: preset.name } },
                create: {
                    businessId,
                    name: preset.name,
                    description: preset.description,
                    permissions: preset.permissions,
                    isSystem: true,
                    isActive: true,
                },
                update: {}, // Mevcut preset güncellenmiyor
            });
        }
    }
}
