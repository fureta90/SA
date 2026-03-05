import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Requiere que el usuario tenga al menos UNO de los permisos indicados.
 *
 * Ej:
 * - @Permissions('add_users')
 * - @Permissions('view_users', 'add_users', 'update_users', 'delete_users')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

