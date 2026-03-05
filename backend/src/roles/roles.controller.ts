import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // GET /roles y GET /roles/:id — cualquier usuario autenticado puede leer
  // (necesario para que el frontend cargue perfiles/roles al iniciar sesión)
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los roles' })
  @ApiResponse({ status: 200, description: 'Lista de roles obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll() {
    return this.rolesService.findAllRoles();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener un rol por ID' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findRoleById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/permissions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener permisos de un rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  async findRolePermissions(@Param('id') id: string) {
    return this.rolesService.findRoleWithPermissions(id);
  }

  // POST /roles — requiere add_profiles
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('add_profiles')
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para crear perfiles' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    try {
      return await this.rolesService.createRole(createRoleDto.name, createRoleDto.permissions);
    } catch (error: any) {
      if (error.message && error.message.includes('Ya existe')) {
        throw new BadRequestException(error.message);
      }
      if (error.number === 2627 || error.number === 2601) {
        throw new BadRequestException(`Ya existe un rol con el nombre "${createRoleDto.name}"`);
      }
      throw error;
    }
  }

  // PATCH /roles/:id — requiere update_profiles
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('update_profiles')
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para modificar perfiles' })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, updateRoleDto.name, updateRoleDto.permissions);
  }

  // DELETE /roles/:id — requiere delete_profiles
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('delete_profiles')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiResponse({ status: 204, description: 'Rol eliminado exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para eliminar perfiles' })
  async remove(@Param('id') id: string) {
    await this.rolesService.deleteRole(id);
  }
}