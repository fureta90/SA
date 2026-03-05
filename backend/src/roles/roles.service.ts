import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface Role {
  id: number | string;
  name: string;
  permissions?: Permission[];
}

export interface Permission {
  id: number | string;
  name: string;  // etiqueta legible: "Ver Campaigns"
  code: string;  // código técnico: "view_campaigns"
}

export interface RolePermission {
  roleId: number | string;
  permissionId: number | string;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Obtener todos los roles
   */
  async findAllRoles(): Promise<Role[]> {
    try {
      const roles = await this.dataSource.query(
        'SELECT id, name FROM dbo.roles ORDER BY id'
      );
      return roles;
    } catch (error) {
      console.error('Error obteniendo roles:', error);
      return [];
    }
  }

  /**
   * Obtener un rol por ID
   */
  async findRoleById(id: number | string): Promise<Role | null> {
    try {
      const idStr = id.toString();
      const result = await this.dataSource.query(
        'SELECT id, name FROM dbo.roles WHERE CAST(id AS VARCHAR(36)) = @0',
        [idStr]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error obteniendo rol:', error);
      return null;
    }
  }

  /**
   * Obtener todos los permisos
   * FIX: description as name (etiqueta legible), name as code (código técnico)
   */
  async findAllPermissions(): Promise<Permission[]> {
    try {
      try {
        const permissions = await this.dataSource.query(
          'SELECT id, description as name, name as code FROM dbo.permissions ORDER BY name'
        );
        return permissions;
      } catch (error: any) {
        if (error.message && error.message.includes('description')) {
          try {
            const permissions = await this.dataSource.query(
              'SELECT id, code as name, name as code FROM dbo.permissions ORDER BY name'
            );
            return permissions;
          } catch (error2: any) {
            if (error2.message && error2.message.includes('code')) {
              const permissions = await this.dataSource.query(
                'SELECT id, name, name as code FROM dbo.permissions ORDER BY name'
              );
              return permissions;
            }
            throw error2;
          }
        }
        throw error;
      }
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      return [];
    }
  }

  /**
   * Obtener un permiso por ID
   * FIX: description as name, name as code
   */
  async findPermissionById(id: number | string): Promise<Permission | null> {
    try {
      const idStr = id.toString();
      try {
        const result = await this.dataSource.query(
          'SELECT id, description as name, name as code FROM dbo.permissions WHERE CAST(id AS VARCHAR(36)) = @0',
          [idStr]
        );
        if (result.length > 0) return result[0];
      } catch (error: any) {
        if (error.message && error.message.includes('description')) {
          try {
            const result = await this.dataSource.query(
              'SELECT id, code as name, name as code FROM dbo.permissions WHERE CAST(id AS VARCHAR(36)) = @0',
              [idStr]
            );
            if (result.length > 0) return result[0];
          } catch (error2: any) {
            if (error2.message && error2.message.includes('code')) {
              const result = await this.dataSource.query(
                'SELECT id, name, name as code FROM dbo.permissions WHERE CAST(id AS VARCHAR(36)) = @0',
                [idStr]
              );
              return result.length > 0 ? result[0] : null;
            }
            throw error2;
          }
        }
        throw error;
      }
      const result = await this.dataSource.query(
        'SELECT id, name, name as code FROM dbo.permissions WHERE CAST(id AS VARCHAR(36)) = @0',
        [idStr]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error obteniendo permiso:', error);
      return null;
    }
  }

  /**
   * Obtener permisos de un rol específico
   * FIX: description as name, name as code
   */
  async findPermissionsByRoleId(roleId: number | string): Promise<Permission[]> {
    try {
      const roleIdStr = roleId.toString();
      try {
        const permissions = await this.dataSource.query(
          `SELECT p.id, p.description as name, p.name as code
           FROM dbo.permissions p
           INNER JOIN dbo.role_permissions rp ON p.id = rp.permission_id
           WHERE CAST(rp.role_id AS VARCHAR(36)) = @0
           ORDER BY p.name`,
          [roleIdStr]
        );
        return permissions;
      } catch (error: any) {
        if (error.message && error.message.includes('description')) {
          try {
            const permissions = await this.dataSource.query(
              `SELECT p.id, p.code as name, p.name as code
               FROM dbo.permissions p
               INNER JOIN dbo.role_permissions rp ON p.id = rp.permission_id
               WHERE CAST(rp.role_id AS VARCHAR(36)) = @0
               ORDER BY p.name`,
              [roleIdStr]
            );
            return permissions;
          } catch (error2: any) {
            if (error2.message && error2.message.includes('code')) {
              const permissions = await this.dataSource.query(
                `SELECT p.id, p.name, p.name as code
                 FROM dbo.permissions p
                 INNER JOIN dbo.role_permissions rp ON p.id = rp.permission_id
                 WHERE CAST(rp.role_id AS VARCHAR(36)) = @0
                 ORDER BY p.name`,
                [roleIdStr]
              );
              return permissions;
            }
            throw error2;
          }
        }
        throw error;
      }
    } catch (error) {
      console.error('Error obteniendo permisos del rol:', error);
      return [];
    }
  }

  /**
   * Obtener roles de un usuario específico
   */
  async findRolesByUserId(userId: string): Promise<Role[]> {
    try {
      try {
        const roles = await this.dataSource.query(
          `SELECT r.id, r.name 
           FROM dbo.roles r
           INNER JOIN dbo.user_roles ur ON r.id = ur.role_id
           WHERE ur.user_id = @0
           ORDER BY r.id`,
          [userId]
        );
        console.log(`[RolesService] Roles encontrados en user_roles para usuario ${userId}:`, roles);
        if (roles && roles.length > 0) return roles;
      } catch (error: any) {
        console.warn(`[RolesService] Error obteniendo roles desde user_roles para usuario ${userId}: ${error.message}`);
      }

      try {
        const roleIdResult = await this.dataSource.query(
          `SELECT TOP 1 role_id FROM dbo.users WHERE id = @0`,
          [userId],
        );
        const roleId = roleIdResult?.[0]?.role_id;
        if (roleId) {
          const roleIdStr = roleId.toString();
          const role = await this.dataSource.query(
            `SELECT id, name FROM dbo.roles WHERE CAST(id AS VARCHAR(36)) = @0`,
            [roleIdStr],
          );
          if (role && role.length > 0) return role;
        }
      } catch (error: any) {
        console.warn(`[RolesService] Error obteniendo roles desde users.role_id para usuario ${userId}: ${error.message}`);
      }

      console.log(`[RolesService] No se encontraron roles para usuario ${userId}`);
      return [];
    } catch (error: any) {
      console.warn(`[RolesService] Error obteniendo roles del usuario ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Combinar permisos base (por rol) con permisos directos en user_permissions
   * FIX: description as name, name as code
   */
  private async mergeUserDirectPermissions(
    userId: string,
    basePermissions: Permission[],
  ): Promise<Permission[]> {
    try {
      let directPerms;
      try {
        directPerms = await this.dataSource.query(
          `SELECT DISTINCT p.id, p.description as name, p.name as code
           FROM dbo.permissions p
           INNER JOIN dbo.user_permissions up ON p.id = up.permission_id
           WHERE up.user_id = @0
           ORDER BY p.id`,
          [userId],
        );
      } catch (error: any) {
        if (error.message && error.message.includes('user_permissions')) {
          directPerms = await this.dataSource.query(
            `SELECT DISTINCT p.id, p.description as name, p.name as code
             FROM dbo.permissions p
             INNER JOIN dbo.user_permission up ON p.id = up.permission_id
             WHERE up.user_id = @0
             ORDER BY p.id`,
            [userId],
          );
        } else {
          throw error;
        }
      }

      if (!directPerms || directPerms.length === 0) return basePermissions;

      const map = new Map<string, any>();
      (basePermissions || []).forEach((p: any) => map.set(p.id?.toString(), p));
      directPerms.forEach((p: any) => map.set(p.id?.toString(), p));
      return Array.from(map.values());
    } catch (error: any) {
      console.log(`[RolesService] Error obteniendo permisos directos para usuario ${userId}:`, error.message);
      return basePermissions;
    }
  }

  /**
   * Obtener todos los permisos de un usuario (roles + directos)
   * FIX: description as name, name as code
   */
  async findPermissionsByUserId(userId: string): Promise<Permission[]> {
    try {
      try {
        let permissions;
        try {
          permissions = await this.dataSource.query(
            `SELECT DISTINCT p.id, p.description as name, p.name as code
             FROM dbo.permissions p
             INNER JOIN dbo.role_permissions rp ON p.id = rp.permission_id
             INNER JOIN dbo.roles r ON rp.role_id = r.id
             INNER JOIN dbo.user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = @0
             ORDER BY p.id`,
            [userId]
          );
        } catch (error: any) {
          if (error.message && error.message.includes('description')) {
            try {
              permissions = await this.dataSource.query(
                `SELECT DISTINCT p.id, p.code as name, p.name as code
                 FROM dbo.permissions p
                 INNER JOIN dbo.role_permissions rp ON p.id = rp.permission_id
                 INNER JOIN dbo.roles r ON rp.role_id = r.id
                 INNER JOIN dbo.user_roles ur ON r.id = ur.role_id
                 WHERE ur.user_id = @0
                 ORDER BY p.id`,
                [userId]
              );
            } catch (error2: any) {
              if (error2.message && error2.message.includes('code')) {
                permissions = await this.dataSource.query(
                  `SELECT DISTINCT p.id, p.name, p.name as code
                   FROM dbo.permissions p
                   INNER JOIN dbo.role_permissions rp ON p.id = rp.permission_id
                   INNER JOIN dbo.roles r ON rp.role_id = r.id
                   INNER JOIN dbo.user_roles ur ON r.id = ur.role_id
                   WHERE ur.user_id = @0
                   ORDER BY p.id`,
                  [userId]
                );
              } else {
                throw error2;
              }
            }
          } else {
            throw error;
          }
        }
        if (permissions.length > 0) {
          console.log(`[RolesService] Permisos encontrados en user_roles para usuario ${userId}: ${permissions.length}`);
          return await this.mergeUserDirectPermissions(userId, permissions);
        }
      } catch (error: any) {
        console.log(`[RolesService] Error obteniendo permisos desde user_roles para usuario ${userId}: ${error.message}`);
      }

      try {
        const roleIdResult = await this.dataSource.query(
          `SELECT TOP 1 role_id FROM dbo.users WHERE id = @0`,
          [userId],
        );
        const roleId = roleIdResult?.[0]?.role_id;
        if (roleId) {
          const roleIdStr = roleId.toString();
          const permsByRole = await this.findPermissionsByRoleId(roleIdStr);
          if (permsByRole && permsByRole.length > 0) {
            console.log(`[RolesService] Permisos encontrados por users.role_id para usuario ${userId}: ${permsByRole.length}`);
            return await this.mergeUserDirectPermissions(userId, permsByRole);
          }
        }
      } catch (error: any) {
        console.log(`[RolesService] Error obteniendo permisos desde users.role_id para usuario ${userId}: ${error.message}`);
      }

      console.log(`[RolesService] No se encontraron permisos para usuario ${userId}`);
      return await this.mergeUserDirectPermissions(userId, []);
    } catch (error: any) {
      console.warn(`[RolesService] Error obteniendo permisos del usuario ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Obtener rol con sus permisos incluidos
   */
  async findRoleWithPermissions(roleId: number | string): Promise<Role | null> {
    try {
      const role = await this.findRoleById(roleId);
      if (!role) return null;
      const permissions = await this.findPermissionsByRoleId(roleId);
      return { ...role, permissions };
    } catch (error) {
      console.error('Error obteniendo rol con permisos:', error);
      return null;
    }
  }

  /**
   * Verificar si un rol es admin
   */
  async isAdminRole(roleId: number): Promise<boolean> {
    try {
      const role = await this.findRoleById(roleId);
      if (!role) return false;
      const roleNameLower = role.name.toLowerCase();
      if (roleNameLower.includes('admin') || roleNameLower.includes('administrador')) return true;
      const allPermissions = await this.findAllPermissions();
      const rolePermissions = await this.findPermissionsByRoleId(roleId);
      return allPermissions.length > 0 && rolePermissions.length === allPermissions.length;
    } catch (error) {
      console.error('Error verificando si es rol admin:', error);
      return false;
    }
  }

  /**
   * Crear un nuevo rol con sus permisos
   */
  async createRole(name: string, permissionIds: (number | string)[]): Promise<Role> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      console.log(`[RolesService] Creando rol con nombre: ${name}, permisos: ${JSON.stringify(permissionIds)}`);
      const existing = await queryRunner.query(
        `SELECT TOP 1 id FROM dbo.roles WHERE name = @0`, [name]
      );
      if (existing && existing.length > 0) throw new Error(`Ya existe un rol con el nombre "${name}"`);

      await queryRunner.query(`INSERT INTO dbo.roles (name) VALUES (@0)`, [name]);

      const roleResult = await queryRunner.query(
        `SELECT TOP 1 id FROM dbo.roles WHERE name = @0 ORDER BY name`, [name]
      );
      if (!roleResult || roleResult.length === 0) throw new Error('No se pudo obtener el ID del rol creado');
      const roleId = roleResult[0].id?.toString();

      if (permissionIds && permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          await queryRunner.query(
            `INSERT INTO dbo.role_permissions (role_id, permission_id) VALUES (@0, @1)`,
            [roleId, permissionId]
          );
        }
      }

      await queryRunner.commitTransaction();
      const role = await this.findRoleWithPermissions(roleId);
      if (!role) throw new Error(`No se pudo encontrar el rol creado con ID: ${roleId}`);
      return role;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error('[RolesService] Error creando rol:', error);
      if (error.number === 2627 || error.number === 2601 ||
          (error.message && error.message.includes('UNIQUE KEY constraint'))) {
        throw new Error(`Ya existe un rol con el nombre "${name}"`);
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Actualizar un rol y sus permisos
   */
  async updateRole(roleId: number | string, name?: string, permissionIds?: (number | string)[]): Promise<Role> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (name !== undefined) {
        await queryRunner.query(`UPDATE dbo.roles SET name = @0 WHERE id = @1`, [name, roleId]);
      }
      if (permissionIds !== undefined) {
        await queryRunner.query(`DELETE FROM dbo.role_permissions WHERE role_id = @0`, [roleId]);
        if (permissionIds.length > 0) {
          for (const permissionId of permissionIds) {
            await queryRunner.query(
              `INSERT INTO dbo.role_permissions (role_id, permission_id) VALUES (@0, @1)`,
              [roleId, permissionId]
            );
          }
        }
      }
      await queryRunner.commitTransaction();
      const role = await this.findRoleWithPermissions(roleId);
      return role!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error actualizando rol:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Eliminar un rol
   */
  async deleteRole(roleId: number | string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`DELETE FROM dbo.role_permissions WHERE role_id = @0`, [roleId]);
      try {
        await queryRunner.query(`DELETE FROM dbo.user_roles WHERE role_id = @0`, [roleId]);
      } catch (error: any) {
        console.log(`Tabla user_roles no encontrada o error: ${error.message}`);
      }
      await queryRunner.query(`DELETE FROM dbo.roles WHERE id = @0`, [roleId]);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error eliminando rol:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Asignar roles a un usuario
   */
  async assignRolesToUser(userId: string, roleIds: (number | string)[]): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      try {
        await queryRunner.query(`DELETE FROM dbo.user_roles WHERE user_id = @0`, [userId]);
        if (roleIds && roleIds.length > 0) {
          for (const roleId of roleIds) {
            await queryRunner.query(
              `INSERT INTO dbo.user_roles (user_id, role_id) VALUES (@0, @1)`,
              [userId, roleId.toString()]
            );
          }
        }
        await queryRunner.commitTransaction();
        return;
      } catch (error: any) {
        console.log(`[RolesService] Tabla user_roles no encontrada: ${error.message}, intentando con users.role_id`);
        await queryRunner.rollbackTransaction();
        await queryRunner.startTransaction();
      }

      if (roleIds && roleIds.length > 0) {
        const firstRoleId = roleIds[0]?.toString();
        await queryRunner.query(`UPDATE dbo.users SET role_id = @0 WHERE id = @1`, [firstRoleId, userId]);
        if (roleIds.length > 1) {
          console.warn(`[RolesService] Solo se asignó el primer rol porque users.role_id solo soporta un rol.`);
        }
      } else {
        await queryRunner.query(`UPDATE dbo.users SET role_id = NULL WHERE id = @0`, [userId]);
      }
      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error('[RolesService] Error asignando roles al usuario:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Actualizar permisos directos de un usuario
   */
  async updateUserDirectPermissions(
    userId: string,
    customPermissions: { added?: string[]; removed?: string[] },
  ): Promise<void> {
    const userIdStr = userId.toString();

    if (Array.isArray(customPermissions.added)) {
      for (const permId of customPermissions.added) {
        const permIdStr = permId.toString();
        try {
          try {
            await this.dataSource.query(
              `IF NOT EXISTS (SELECT 1 FROM dbo.user_permissions WHERE user_id = @0 AND permission_id = @1)
               INSERT INTO dbo.user_permissions (user_id, permission_id) VALUES (@0, @1)`,
              [userIdStr, permIdStr],
            );
          } catch (error: any) {
            if (error.message && error.message.includes('user_permissions')) {
              await this.dataSource.query(
                `IF NOT EXISTS (SELECT 1 FROM dbo.user_permission WHERE user_id = @0 AND permission_id = @1)
                 INSERT INTO dbo.user_permission (user_id, permission_id) VALUES (@0, @1)`,
                [userIdStr, permIdStr],
              );
            } else throw error;
          }
        } catch (error: any) {
          console.log(`[RolesService] Error insertando permiso directo ${permIdStr}:`, error.message);
        }
      }
    }

    if (Array.isArray(customPermissions.removed)) {
      for (const permId of customPermissions.removed) {
        const permIdStr = permId.toString();
        try {
          try {
            await this.dataSource.query(
              `DELETE FROM dbo.user_permissions WHERE user_id = @0 AND permission_id = @1`,
              [userIdStr, permIdStr],
            );
          } catch (error: any) {
            if (error.message && error.message.includes('user_permissions')) {
              await this.dataSource.query(
                `DELETE FROM dbo.user_permission WHERE user_id = @0 AND permission_id = @1`,
                [userIdStr, permIdStr],
              );
            } else throw error;
          }
        } catch (error: any) {
          console.log(`[RolesService] Error eliminando permiso directo ${permIdStr}:`, error.message);
        }
      }
    }
  }

  /**
   * Crear un nuevo permiso
   */
  async createPermission(name: string, code?: string): Promise<Permission> {
    try {
      console.log(`[RolesService] Creando permiso con nombre: ${name}, descripción: ${code || 'N/A'}`);
      const existing = await this.dataSource.query(
        `SELECT TOP 1 id FROM dbo.permissions WHERE name = @0`, [name]
      );
      if (existing && existing.length > 0) throw new Error(`Ya existe un permiso con el nombre "${name}"`);

      if (code !== undefined && code !== null && code !== '') {
        try {
          await this.dataSource.query(
            `INSERT INTO dbo.permissions (name, description) VALUES (@0, @1)`, [name, code]
          );
        } catch (error: any) {
          if (error.message && error.message.includes('description')) {
            try {
              await this.dataSource.query(
                `INSERT INTO dbo.permissions (name, code) VALUES (@0, @1)`, [name, code]
              );
            } catch (error2: any) {
              if (error2.message && error2.message.includes('code')) {
                await this.dataSource.query(`INSERT INTO dbo.permissions (name) VALUES (@0)`, [name]);
              } else throw error2;
            }
          } else throw error;
        }
      } else {
        await this.dataSource.query(`INSERT INTO dbo.permissions (name) VALUES (@0)`, [name]);
      }

      const result = await this.dataSource.query(
        `SELECT TOP 1 id FROM dbo.permissions WHERE name = @0 ORDER BY name`, [name]
      );
      if (!result || result.length === 0) throw new Error('No se pudo obtener el ID del permiso creado');

      const permissionId = result[0].id?.toString() || result[0].id;
      const permission = await this.findPermissionById(permissionId);
      if (!permission) throw new Error(`No se pudo encontrar el permiso creado con ID: ${permissionId}`);
      return permission;
    } catch (error: any) {
      console.error('[RolesService] Error creando permiso:', error);
      if (error.number === 2627 || error.number === 2601 ||
          (error.message && error.message.includes('UNIQUE KEY constraint'))) {
        throw new Error(`Ya existe un permiso con el nombre "${name}"`);
      }
      throw error;
    }
  }

  /**
   * Actualizar un permiso existente
   */
  async updatePermission(id: number | string, name?: string, code?: string): Promise<Permission> {
    try {
      const existingPermission = await this.findPermissionById(id);
      if (!existingPermission) throw new Error(`Permiso con ID ${id} no encontrado`);
      const idStr = id.toString();

      if (name !== undefined) {
        await this.dataSource.query(
          `UPDATE dbo.permissions SET name = @0 WHERE CAST(id AS VARCHAR(36)) = @1`, [name, idStr]
        );
      }
      if (code !== undefined) {
        try {
          await this.dataSource.query(
            `UPDATE dbo.permissions SET description = @0 WHERE CAST(id AS VARCHAR(36)) = @1`, [code, idStr]
          );
        } catch (error: any) {
          if (error.message && (error.message.includes('description') || error.message.includes('code'))) {
            try {
              await this.dataSource.query(
                `UPDATE dbo.permissions SET code = @0 WHERE CAST(id AS VARCHAR(36)) = @1`, [code, idStr]
              );
            } catch (error2: any) {
              console.log(`[RolesService] Columna description/code no existe, ignorando actualización`);
            }
          } else throw error;
        }
      }

      const permission = await this.findPermissionById(id);
      if (!permission) throw new Error(`No se pudo encontrar el permiso actualizado con ID: ${id}`);
      return permission;
    } catch (error: any) {
      console.error('[RolesService] Error actualizando permiso:', error);
      throw error;
    }
  }

  /**
   * Eliminar un permiso
   */
  async deletePermission(id: number | string): Promise<void> {
    try {
      const existingPermission = await this.findPermissionById(id);
      if (!existingPermission) throw new Error(`Permiso con ID ${id} no encontrado`);
      const idStr = id.toString();
      await this.dataSource.query(
        `DELETE FROM dbo.role_permissions WHERE CAST(permission_id AS VARCHAR(36)) = @0`, [idStr]
      );
      await this.dataSource.query(
        `DELETE FROM dbo.permissions WHERE CAST(id AS VARCHAR(36)) = @0`, [idStr]
      );
      console.log(`[RolesService] Permiso eliminado exitosamente`);
    } catch (error: any) {
      console.error('[RolesService] Error eliminando permiso:', error);
      throw error;
    }
  }

  /**
   * Crear permisos básicos de gestión si no existen
   */
  async createBasicPermissions(): Promise<void> {
    const basicPermissions = [
      { name: 'Agregar Permisos', description: 'add_permissions' },
      { name: 'Modificar Permisos', description: 'update_permissions' },
      { name: 'Eliminar Permisos', description: 'delete_permissions' },
    ];
    for (const perm of basicPermissions) {
      try {
        const existing = await this.dataSource.query(
          `SELECT TOP 1 id FROM dbo.permissions WHERE name = @0`, [perm.name]
        );
        if (!existing || existing.length === 0) {
          await this.createPermission(perm.name, perm.description);
          console.log(`[RolesService] Permiso "${perm.name}" creado exitosamente`);
        }
      } catch (error: any) {
        console.error(`[RolesService] Error creando permiso "${perm.name}":`, error.message);
      }
    }
  }
}