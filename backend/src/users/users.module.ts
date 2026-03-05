import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Permission } from '../roles/entities/permission.entity'
import { Role } from '../roles/entities/role.entity'
import { RolesModule } from '../roles/roles.module'
import { BootstrapAdminService } from './bootstrap-admin.service'
import { User } from './entities/user.entity'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UserPermission } from '../roles/entities/user-permission.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, UserPermission]),
    RolesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, BootstrapAdminService],
  exports: [UsersService],
})
export class UsersModule {}