import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiBody 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('add_users')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o email ya registrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para crear usuarios' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_users', 'add_users', 'update_users', 'delete_users')
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para ver usuarios' })
  findAll() {
    return this.usersService.findAllWithRoles();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_users', 'add_users', 'update_users', 'delete_users')
  @Get('search/usuario')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Buscar usuarios por nombre de usuario' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios encontrados' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para ver usuarios' })
  searchByUsuario(@Query('q') q: string) {
    return this.usersService.searchByUsuarioWithRoles(q || '');
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_users', 'add_users', 'update_users', 'delete_users')
  @Get('search/empresa')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Buscar usuarios por nombre de empresa' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios encontrados' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para ver usuarios' })
  searchByEmpresa(@Query('q') q: string) {
    return this.usersService.searchByEmpresaWithRoles(q || '');
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_users', 'add_users', 'update_users', 'delete_users')
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para ver usuarios' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOneWithRoles(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('update_users')
  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para modificar usuarios' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('delete_users')
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para eliminar usuarios' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
