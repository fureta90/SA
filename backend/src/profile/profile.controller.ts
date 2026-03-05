import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  @UseGuards(JwtAuthGuard) /* se utiliza el guard de autenticación */
  @Get() /* se define la ruta */
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ 
    status: 200, 
    description: 'Perfil del usuario obtenido exitosamente',
    schema: {
      example: {
        message: 'Ruta protegida',
        user: {
          id: '1',
          email: 'usuario@example.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          roles: [],
          permissions: []
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProfile(@Req() req) {
    const userId = req.user?.userId || req.user?.sub;
    
    if (!userId) {
      return {
        message: 'Ruta protegida',
        user: req.user,
      };
    }

    // Obtener el usuario completo
    const user = await this.usersService.findOne(userId);
    
    if (!user) {
      return {
        message: 'Ruta protegida',
        user: req.user,
      };
    }

    // Obtener roles del usuario (el servicio ya maneja user_roles y users.role_id)
    const roles = await this.rolesService.findRolesByUserId(userId);
    
    console.log(`[Profile] Usuario ${userId} - Roles encontrados:`, roles);

    // Obtener permisos del usuario (a través de sus roles)
    let permissions = await this.rolesService.findPermissionsByUserId(userId);
    
    // Verificar si el usuario es admin por:
    // 1. Tener un rol con nombre que contenga "admin" o "administrador"
    // 2. Tener un email que indique que es admin (por si no tiene rol asignado)
    let isAdmin = false;
    
    if (roles.length > 0) {
      isAdmin = roles.some(role => {
        const roleNameLower = role.name.toLowerCase();
        return roleNameLower.includes('admin') || roleNameLower.includes('administrador');
      });
    }
    
    // Si no se encontró rol admin pero el email sugiere que es admin, verificar
    if (!isAdmin) {
      const emailLower = user.email?.toLowerCase() || '';
      // Verificar si el email contiene "admin" o está en la lista de emails admin conocidos
      if (emailLower.includes('admin') || 
          emailLower === 'lucas.domenica33@gmail.com' || 
          emailLower === 'fureta@findcontrol.info') {
        console.log(`[Profile] Usuario ${userId} detectado como admin por email: ${user.email}`);
        isAdmin = true;
        
        // Intentar encontrar el rol admin en la base de datos
        const allRoles = await this.rolesService.findAllRoles();
        const adminRole = allRoles.find(r => {
          const roleNameLower = r.name.toLowerCase();
          return roleNameLower.includes('admin') || roleNameLower.includes('administrador');
        });
        
        if (adminRole) {
          roles.push(adminRole);
          console.log(`[Profile] Rol admin encontrado y asignado:`, adminRole);
        }
      }
    }

    console.log(`[Profile] Usuario ${userId} - isAdmin: ${isAdmin}, Permisos antes: ${permissions.length}`);

    if (isAdmin) {
      // Si es admin, obtener todos los permisos disponibles
      const allPermissions = await this.rolesService.findAllPermissions();
      permissions = allPermissions;
      console.log(`[Profile] Usuario ${userId} - Permisos después (admin): ${permissions.length}`);
    }

    return {
      message: 'Ruta protegida',
      user: {
        ...user,
        roles: roles.map(r => ({ id: r.id, name: r.name })),
        permissions: permissions.map(p => ({ id: p.id, name: p.name, code: p.code })),
        isAdmin,
      },
    };
  }
}