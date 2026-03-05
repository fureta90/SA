import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesService } from '../roles/roles.service';


@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(forwardRef(() => RolesService))
    private rolesService: RolesService,
  ) {}
  
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  private async withRoles(user: User): Promise<any> {
    // Cargar roles del usuario
    const roles = await this.rolesService.findRolesByUserId(user.id);

    // Cargar todos los permisos efectivos del usuario (por roles + directos en user_permissions)
    // Esto permite que el frontend conozca ANTES de abrir el modal qué permisos
    // tiene realmente el usuario, incluyendo los agregados fuera del perfil.
    const permissions = await this.rolesService.findPermissionsByUserId(
      user.id.toString(),
    );

    return {
      ...user,
      roles: (roles || []).map((r: any) => ({ id: r.id, name: r.name })),
      permissions: (permissions || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
      })),
    };
  }

  async findAllWithRoles(): Promise<any[]> {
    const users = await this.findAll();
    return Promise.all(users.map((u) => this.withRoles(u)));
  }

  async findOneWithRoles(id: string): Promise<any | null> {
    const user = await this.findOne(id);
    if (!user) return null;
    return this.withRoles(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByUsuario(usuario: string): Promise<User | null> {
    if (!usuario || usuario.trim() === '') {
      return null;
    }
    // Buscar con trim y case-insensitive para evitar problemas con espacios y mayúsculas/minúsculas
    const usuarioTrimmed = usuario.trim();
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.usuario)) = LOWER(:usuario)', { usuario: usuarioTrimmed })
      .getOne();
  }

  // Usar SOLO cuando necesitás validar contraseña (password tiene select:false)
  async findByUsuarioWithPassword(usuario: string): Promise<User | null> {
    if (!usuario || usuario.trim() === '') {
      return null;
    }
    const usuarioTrimmed = usuario.trim();
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(TRIM(user.usuario)) = LOWER(:usuario)', { usuario: usuarioTrimmed })
      .getOne();
  }

  async searchByUsuario(usuario: string): Promise<User[]> {
    if (!usuario || usuario.trim() === '') {
      return this.findAll();
    }
    const usuarioTrimmed = usuario.trim();
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.usuario)) LIKE LOWER(:usuario)', { usuario: `%${usuarioTrimmed}%` })
      .getMany();
  }

  async searchByEmpresa(empresa: string): Promise<User[]> {
    if (!empresa || empresa.trim() === '') {
      return this.findAll();
    }
    const empresaTrimmed = empresa.trim();
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.empresa)) LIKE LOWER(:empresa)', { empresa: `%${empresaTrimmed}%` })
      .getMany();
  }

  async searchByUsuarioWithRoles(usuario: string): Promise<any[]> {
    const users = await this.searchByUsuario(usuario);
    return Promise.all(users.map((u) => this.withRoles(u)));
  }

  async searchByEmpresaWithRoles(empresa: string): Promise<any[]> {
    const users = await this.searchByEmpresa(empresa);
    return Promise.all(users.map((u) => this.withRoles(u)));
  }
  
  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
  
    // Establecer usuario automáticamente si no se proporciona (usar email sin dominio)
    const usuario = (createUserDto.usuario || createUserDto.email?.split('@')[0] || '').trim();
    
    // Validar que el usuario sea único (si no está vacío)
    if (usuario !== '') {
      const usuarioExists = await this.findByUsuario(usuario);
      if (usuarioExists) {
        throw new BadRequestException('Usuario existente por favor elija otro');
      }
    }
    
    // Establecer empresa automáticamente si no se proporciona
    const empresa = createUserDto.empresa || '';
    
    const user = this.usersRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      empresa: empresa,
      usuario: usuario,
      photoUrl: createUserDto.photoUrl,
      isActive: createUserDto.isActive ?? true,
    });
  
    try {
      const savedUser = await this.usersRepository.save(user);
      
      // Si se proporcionaron profileIds en el DTO, asignar los roles al usuario
      if (createUserDto.profileIds && createUserDto.profileIds.length > 0) {
        try {
          console.log(`[UsersService] Asignando roles ${JSON.stringify(createUserDto.profileIds)} al usuario ${savedUser.id}`);
          await this.rolesService.assignRolesToUser(savedUser.id, createUserDto.profileIds);
          console.log(`[UsersService] Roles asignados exitosamente`);
        } catch (roleError: any) {
          console.error('[UsersService] Error asignando roles al usuario recién creado:', roleError);
          console.error('[UsersService] Stack trace:', roleError.stack);
          // Lanzar el error para que el usuario sepa que hubo un problema
          throw new BadRequestException(`Error al asignar perfiles al usuario: ${roleError.message || 'Error desconocido'}`);
        }
      }
      
      // Retornar el usuario con roles para que el frontend pueda reflejar perfiles asignados
      return (await this.findOneWithRoles(savedUser.id)) as any;
    } catch (error: any) {
      // Capturar errores de restricción unique de la base de datos
      if (error.code === '23505' || error.number === 2601 || error.number === 2627) {
        // Error de violación de restricción unique (PostgreSQL: 23505, SQL Server: 2601/2627)
        if (error.message?.includes('usuario') || error.message?.includes('IX_users_usuario_unique')) {
          throw new BadRequestException('Usuario existente por favor elija otro');
        }
        if (error.message?.includes('email')) {
          throw new BadRequestException('El email ya está en uso por otro usuario');
        }
      }
      throw error;
    }
  }
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Verificar que el usuario existe
    const existingUser = await this.findOne(id);
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    // Validar que no se intente cambiar el email a uno existente
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.findByEmail(updateUserDto.email);
      if (emailExists) {
        throw new BadRequestException('El email ya está en uso por otro usuario');
      }
    }
    
    // Preparar los datos para actualizar
    const updateData: Partial<User> = {};
    
    if (updateUserDto.email) {
      updateData.email = updateUserDto.email;
    }
    
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    if (updateUserDto.firstName !== undefined) {
      updateData.firstName = updateUserDto.firstName;
    }
    
    if (updateUserDto.lastName !== undefined) {
      updateData.lastName = updateUserDto.lastName;
    }
    
    // Actualizar empresa si se proporciona (incluyendo cadena vacía)
    if (updateUserDto.empresa !== undefined) {
      updateData.empresa = updateUserDto.empresa || '';
    }

    // Actualizar foto de perfil si se proporciona (incluyendo cadena vacía para borrar)
    if (updateUserDto.photoUrl !== undefined) {
      updateData.photoUrl = updateUserDto.photoUrl || '';
    }
    
    // Actualizar usuario si se proporciona, o generar desde email si cambió
    // IMPORTANTE: Siempre validar el campo usuario cuando se envía en la actualización
    let nuevoUsuario: string | undefined;
    if (updateUserDto.usuario !== undefined) {
      // Si se envía explícitamente (incluso si es cadena vacía), usarlo
      nuevoUsuario = updateUserDto.usuario.trim();
    } else if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      // Si cambió el email y no se proporcionó usuario, generar desde el nuevo email
      nuevoUsuario = (updateUserDto.email.split('@')[0] || '').trim();
    }
    
    // DEBUG: Log para depuración
    console.log('DEBUG update - nuevoUsuario:', nuevoUsuario);
    console.log('DEBUG update - existingUser.usuario:', existingUser.usuario);
    console.log('DEBUG update - updateUserDto.usuario:', updateUserDto.usuario);
    
    // Validar que el nuevo usuario sea único SIEMPRE que se esté estableciendo o cambiando
    if (nuevoUsuario !== undefined) {
      const nuevoUsuarioTrimmed = nuevoUsuario.trim();
      const usuarioActual = existingUser.usuario ? existingUser.usuario.trim() : '';
      
      // Validar unicidad si el nuevo usuario no está vacío
      if (nuevoUsuarioTrimmed !== '') {
        // Normalizar para comparación (case-insensitive)
        const nuevoUsuarioLower = nuevoUsuarioTrimmed.toLowerCase();
        const usuarioActualLower = usuarioActual.toLowerCase();
        
        console.log('DEBUG - Comparando:', nuevoUsuarioLower, 'vs', usuarioActualLower);
        
        // SIEMPRE validar unicidad cuando el nuevo usuario es diferente al actual
        // Esto incluye casos donde el usuario actual es null, undefined o vacío
        if (nuevoUsuarioLower !== usuarioActualLower) {
          // Buscar si existe otro usuario con este nombre (case-insensitive)
          const usuarioExists = await this.findByUsuario(nuevoUsuarioTrimmed);
          console.log('DEBUG - usuarioExists:', usuarioExists ? usuarioExists.id : 'null');
          console.log('DEBUG - existingUser.id:', existingUser.id);
          
          if (usuarioExists) {
            // Si existe y es un usuario diferente, lanzar error
            if (usuarioExists.id !== existingUser.id) {
              console.log('DEBUG - ERROR: Usuario duplicado detectado');
              throw new BadRequestException('Usuario existente por favor elija otro');
            }
          }
        } else {
          // Si el nuevo usuario es igual al actual, validar que no haya duplicados en la BD
          const usuarioExists = await this.findByUsuario(nuevoUsuarioTrimmed);
          if (usuarioExists && usuarioExists.id !== existingUser.id) {
            throw new BadRequestException('Usuario existente por favor elija otro');
          }
        }
      }
      
      // Actualizar el usuario (incluso si es cadena vacía)
      updateData.usuario = nuevoUsuarioTrimmed;
    } else {
      // Si no se proporciona usuario en la actualización, validar que el usuario actual no esté duplicado
      if (existingUser.usuario && existingUser.usuario.trim() !== '') {
        const usuarioActualTrimmed = existingUser.usuario.trim();
        const usuarioExists = await this.findByUsuario(usuarioActualTrimmed);
        if (usuarioExists && usuarioExists.id !== existingUser.id) {
          throw new BadRequestException('Usuario existente por favor elija otro');
        }
      }
    }
    
    if (updateUserDto.isActive !== undefined) {
      updateData.isActive = updateUserDto.isActive;
    }
    
    try {
      await this.usersRepository.update(id, updateData);
      
      // Si se proporcionaron profileIds, asignar los roles al usuario
      if (updateUserDto.profileIds !== undefined) {
        try {
          console.log(`[UsersService] Actualizando roles ${JSON.stringify(updateUserDto.profileIds)} para usuario ${id}`);
          await this.rolesService.assignRolesToUser(id, updateUserDto.profileIds);
          console.log(`[UsersService] Roles actualizados exitosamente`);
        } catch (roleError: any) {
          console.error('[UsersService] Error asignando roles al usuario:', roleError);
          console.error('[UsersService] Stack trace:', roleError.stack);
          // Lanzar el error para que el usuario sepa que hubo un problema
          throw new BadRequestException(`Error al asignar perfiles al usuario: ${roleError.message || 'Error desconocido'}`);
        }
      }

      // Actualizar permisos directos en user_permissions si vienen desde el frontend
      console.log('[UsersService] customPermissions recibidos en update:', updateUserDto.customPermissions);
      if (updateUserDto.customPermissions) {
        try {
          await this.rolesService.updateUserDirectPermissions(id, updateUserDto.customPermissions);
          console.log('[UsersService] Permisos directos actualizados en user_permissions para usuario', id);
        } catch (permError: any) {
          console.error('[UsersService] Error actualizando permisos directos del usuario:', permError.message);
        }
      }
      
      const updatedUser = await this.findOneWithRoles(id);
      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found after update`);
      }
      return updatedUser as any;
    } catch (error: any) {
      // Capturar errores de restricción unique de la base de datos
      if (error.code === '23505' || error.number === 2601 || error.number === 2627) {
        // Error de violación de restricción unique (PostgreSQL: 23505, SQL Server: 2601/2627)
        if (error.message?.includes('usuario') || error.message?.includes('IX_users_usuario_unique')) {
          throw new BadRequestException('Usuario existente por favor elija otro');
        }
        if (error.message?.includes('email')) {
          throw new BadRequestException('El email ya está en uso por otro usuario');
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    // Verificar que el usuario existe antes de eliminar
    const existingUser = await this.findOne(id);
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    await this.usersRepository.delete(id);
  }
}
