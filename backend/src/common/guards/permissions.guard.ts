import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '../../roles/roles.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const jwtUser = request.user;

    const userId: string | undefined = jwtUser?.userId || jwtUser?.sub;
    const emailLower: string = (jwtUser?.email || '').toString().toLowerCase();

    if (!userId) {
      throw new ForbiddenException('Acceso denegado: usuario no autenticado');
    }

    // Admin: por rol o por email (misma lógica que ProfileController).
    let isAdmin = false;
    try {
      const roles = await this.rolesService.findRolesByUserId(userId);
      isAdmin = roles.some((r: any) => {
        const nameLower = (r?.name || '').toString().toLowerCase();
        return nameLower.includes('admin') || nameLower.includes('administrador');
      });
    } catch {
      // Si falla la consulta, seguimos con chequeo por email.
    }

    if (
      !isAdmin &&
      (emailLower.includes('admin') ||
        emailLower === 'lucas.domenica33@gmail.com' ||
        emailLower === 'fureta@findcontrol.info')
    ) {
      isAdmin = true;
    }

    if (isAdmin) {
      return true;
    }

    // Alias de permisos (por si en BD se guardaron como nombre en español)
    const aliases: Record<string, string[]> = {
      add_users: ['add_users', 'create_users', 'crear usuarios', 'crear_usuarios', 'crear usuarios'],
      update_users: ['update_users', 'edit_users', 'modificar usuarios', 'modificar_usuarios', 'modificar usuarios'],
      delete_users: ['delete_users', 'remove_users', 'eliminar usuarios', 'eliminar_usuarios', 'eliminar usuarios'],
      view_users: ['view_users', 'list_users', 'ver usuarios', 'ver_usuarios', 'ver usuarios'],

      add_profiles: ['add_profiles', 'create_profiles', 'crear perfiles', 'crear_perfiles'],
      update_profiles: ['update_profiles', 'edit_profiles', 'modificar perfiles', 'modificar_perfiles'],
      delete_profiles: ['delete_profiles', 'remove_profiles', 'eliminar perfiles', 'eliminar_perfiles'],
      view_profiles: ['view_profiles', 'list_profiles', 'ver perfiles', 'ver_perfiles'],

      view_campaigns: ['view_campaigns', 'ver campañas', 'ver_campañas'],
      add_campaigns: ['add_campaigns', 'create_campaigns', 'crear campañas', 'crear_campañas'],
      update_campaigns: ['update_campaigns', 'edit_campaigns', 'modificar campañas', 'modificar_campañas'],
      delete_campaigns: ['delete_campaigns', 'remove_campaigns', 'eliminar campañas', 'eliminar_campañas'],

      add_permissions: ['add_permissions', 'create_permissions', 'crear permisos', 'crear_permisos'],
      update_permissions: ['update_permissions', 'edit_permissions', 'modificar permisos', 'modificar_permisos'],
      delete_permissions: ['delete_permissions', 'remove_permissions', 'eliminar permisos', 'eliminar_permisos'],
      manage_permissions: ['manage_permissions', 'gestionar_permisos', 'gestionar permisos'],
    };

    const perms = await this.rolesService.findPermissionsByUserId(userId);
    const userPermCodes = new Set(
      perms
        .map((p: any) => (p?.code ?? p?.name ?? '').toString().toLowerCase())
        .filter(Boolean),
    );

    const requiredLower = required.map((p) => p.toLowerCase());
    const hasAny = requiredLower.some((req) => {
      const candidates = aliases[req] ? aliases[req] : [req];
      return candidates.some((c) => userPermCodes.has(c.toLowerCase()));
    });

    if (!hasAny) {
      throw new ForbiddenException(
        'Acceso denegado: no tienes los permisos necesarios',
      );
    }

    return true;
  }
}