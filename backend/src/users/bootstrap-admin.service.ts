import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'
import { RolesService } from '../roles/roles.service'
import { Permission } from '../roles/entities/permission.entity'
import { Role } from '../roles/entities/role.entity'
import { User } from './entities/user.entity'

const ADMIN_PERMISSIONS = [
  { name: 'add_users',          description: 'Crear usuarios' },
  { name: 'update_users',       description: 'Editar usuarios' },
  { name: 'delete_users',       description: 'Eliminar usuarios' },
  { name: 'add_roles',          description: 'Crear roles' },
  { name: 'update_roles',       description: 'Editar roles' },
  { name: 'delete_roles',       description: 'Eliminar roles' },
  { name: 'add_permissions',    description: 'Crear permisos' },
  { name: 'update_permissions', description: 'Editar permisos' },
  { name: 'delete_permissions', description: 'Eliminar permisos' },
  { name: 'add_campaigns',      description: 'Crear campañas' },
  { name: 'update_campaigns',   description: 'Editar campañas' },
  { name: 'delete_campaigns',   description: 'Eliminar campañas' },
  { name: 'view_analytics',     description: 'Ver Speech Analytics' },
]

@Injectable()
export class BootstrapAdminService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapAdminService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly rolesService: RolesService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async onModuleInit() {
    const enabled = this.configService.get<string>('BOOTSTRAP_ADMIN_ENABLED') === 'true'
    if (!enabled) return

    try {
      // Verificar por rol Admin en lugar de contar usuarios
      const adminRoleExists = await this.rolesRepository.findOne({
        where: { name: 'Admin' },
      })
      if (adminRoleExists) {
        this.logger.log('Bootstrap ya fue ejecutado, omitiendo.')
        return
      }

      // 1. Crear permisos
      const savedPermissions: Permission[] = []
      for (const permData of ADMIN_PERMISSIONS) {
        let perm = await this.permissionsRepository.findOne({
          where: { name: permData.name },
        })
        if (!perm) {
          perm = this.permissionsRepository.create(permData)
          perm = await this.permissionsRepository.save(perm)
        }
        savedPermissions.push(perm)
      }
      this.logger.log(`${savedPermissions.length} permisos creados`)

      // 2. Crear rol Admin con todos los permisos
      const adminRole = this.rolesRepository.create({
        name: 'Admin',
        description: 'Administrador con acceso total',
        permissions: savedPermissions,
      })
      const savedRole = await this.rolesRepository.save(adminRole)
      this.logger.log(`Rol Admin creado con id: ${savedRole.id}`)

      // 3. Crear usuario admin
      const email    = this.configService.get<string>('BOOTSTRAP_ADMIN_EMAIL')    || 'fureta@findcontrol.info'
      const password = this.configService.get<string>('BOOTSTRAP_ADMIN_PASSWORD') || 'Cambiar123!'
      const usuarioFromEmail = email.includes('@') ? email.split('@')[0] : 'admin'
      const usuario  = (this.configService.get<string>('BOOTSTRAP_ADMIN_USUARIO') || usuarioFromEmail).trim()

      const hashedPassword = await bcrypt.hash(password, 10)

      const admin = this.usersRepository.create({
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: '',
        empresa: '',
        usuario,
        isActive: true,
      })

      const savedAdmin = await this.usersRepository.save(admin)
      this.logger.log(`Usuario admin creado con id: ${savedAdmin.id}`)

      // 4. Asignar rol Admin al usuario ← esto faltaba
      await this.rolesService.assignRolesToUser(savedAdmin.id, [savedRole.id])
      this.logger.warn(
        `Bootstrap completo. Usuario: ${email} (${usuario}). Cambiar contraseña luego del primer login.`,
      )
    } catch (e: unknown) {
      const err = e as Error
      this.logger.error(`Error en bootstrap: ${err?.message || e}`, err?.stack)
    }
  }
}