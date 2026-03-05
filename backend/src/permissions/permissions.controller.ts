import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesService } from '../roles/roles.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  // GET — cualquier usuario autenticado puede leer la lista de permisos
  // (necesario para que el frontend muestre los checkboxes de perfiles)
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los permisos' })
  async findAll() {
    return this.rolesService.findAllPermissions();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener un permiso por ID' })
  @ApiParam({ name: 'id', description: 'ID del permiso' })
  async findOne(@Param('id') id: string) {
    const idNum = parseInt(id);
    const permissionId = isNaN(idNum) ? id : idNum;
    return this.rolesService.findPermissionById(permissionId);
  }

  // POST — requiere add_permissions
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('add_permissions', 'manage_permissions')
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo permiso' })
  @ApiBody({ type: CreatePermissionDto })
  @ApiResponse({ status: 201, description: 'Permiso creado exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para crear permisos' })
  async create(@Body() createPermissionDto: CreatePermissionDto) {
    try {
      return await this.rolesService.createPermission(
        createPermissionDto.name,
        createPermissionDto.code
      );
    } catch (error: any) {
      if (error.message && error.message.includes('Ya existe')) {
        throw new BadRequestException(error.message);
      }
      if (error.number === 2627 || error.number === 2601) {
        throw new BadRequestException(`Ya existe un permiso con el nombre "${createPermissionDto.name}"`);
      }
      throw error;
    }
  }

  // PATCH — requiere update_permissions
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('update_permissions', 'manage_permissions')
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un permiso existente' })
  @ApiParam({ name: 'id', description: 'ID del permiso' })
  @ApiBody({ type: UpdatePermissionDto })
  @ApiResponse({ status: 200, description: 'Permiso actualizado exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para modificar permisos' })
  async update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.rolesService.updatePermission(id, updatePermissionDto.name, updatePermissionDto.code);
  }

  // DELETE — requiere delete_permissions
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('delete_permissions', 'manage_permissions')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un permiso' })
  @ApiParam({ name: 'id', description: 'ID del permiso' })
  @ApiResponse({ status: 204, description: 'Permiso eliminado exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para eliminar permisos' })
  async remove(@Param('id') id: string) {
    await this.rolesService.deletePermission(id);
  }
}