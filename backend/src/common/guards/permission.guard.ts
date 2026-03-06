import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    PERMISSIONS_KEY,
    ANY_PERMISSIONS_KEY,
} from '../decorators/permissions.decorator';
import { Permission, ROLE_DEFAULT_PERMISSIONS } from '../constants/permissions';
import { normalizeRole } from '../authz';
import { ROLES } from '../constants/roles';

interface AuthUser {
    id: number;
    businessId: number;
    role: string;
    // Kullanıcının atanmış yetki grubundaki izinler
    // JWT token içine inject edilir (PermissionService.resolveForUser)
    resolvedPermissions?: string[];
}

/**
 * Granüler yetki bazlı erişim kontrolü.
 *
 * Çözümleme sırası (rol-yetki-matrisi.md §7.2):
 * 1. SUPER_ADMIN → tüm yetkiler verilir
 * 2. Rol → ROLE_DEFAULT_PERMISSIONS'dan varsayılan yetkiler alınır
 * 3. Yetki grubu → resolvedPermissions inject edilmişse eklenir
 * 4. RequirePermissions / RequireAnyPermission kontrolü yapılır
 */
@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredAll = this.reflector.getAllAndOverride<Permission[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );
        const requiredAny = this.reflector.getAllAndOverride<Permission[]>(
            ANY_PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Yetki kısıtlaması tanımlanmamışsa geç
        if (!requiredAll?.length && !requiredAny?.length) {
            return true;
        }

        const { user } = context
            .switchToHttp()
            .getRequest<{ user?: AuthUser }>();

        if (!user) {
            throw new ForbiddenException('Kimlik doğrulaması gerekli');
        }

        // Normalize rol
        const normalizedRole = normalizeRole(user.role);
        if (!normalizedRole) {
            throw new ForbiddenException('Geçersiz rol');
        }

        // SUPER_ADMIN sınırsız erişime sahip
        if (normalizedRole === ROLES.SUPER_ADMIN) return true;

        // Aktif yetkiler = rol varsayılanları + yetki grubu yetkileri
        const defaultPerms: string[] =
            ROLE_DEFAULT_PERMISSIONS[normalizedRole] ?? [];
        const groupPerms: string[] = user.resolvedPermissions ?? [];
        const activePerms = new Set([...defaultPerms, ...groupPerms]);

        if (requiredAll?.length) {
            const hasAll = requiredAll.every((p) => activePerms.has(p));
            if (!hasAll) {
                throw new ForbiddenException(
                    `Bu işlem için gerekli yetki eksik: ${requiredAll.join(', ')}`,
                );
            }
        }

        if (requiredAny?.length) {
            const hasAny = requiredAny.some((p) => activePerms.has(p));
            if (!hasAny) {
                throw new ForbiddenException(
                    `Bu işlem için şu yetkilerden en az biri gerekli: ${requiredAny.join(', ')}`,
                );
            }
        }

        return true;
    }
}
