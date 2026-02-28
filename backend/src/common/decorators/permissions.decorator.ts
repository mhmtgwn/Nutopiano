import { SetMetadata } from '@nestjs/common';
import { Permission } from '../constants/permissions';

export const PERMISSIONS_KEY = 'required_permissions';
export const ANY_PERMISSIONS_KEY = 'any_permissions';

/**
 * Tüm belirtilen yetkilerin varlığını zorunlu kılar (AND mantığı)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Belirtilen yetkilerden en az birinin varlığını zorunlu kılar (OR mantığı)
 */
export const RequireAnyPermission = (...permissions: Permission[]) =>
    SetMetadata(ANY_PERMISSIONS_KEY, permissions);
