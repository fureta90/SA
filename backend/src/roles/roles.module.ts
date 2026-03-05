import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Permission } from './entities/permission.entity'
import { Role } from './entities/role.entity'
import { RolesController } from './roles.controller'
import { RolesService } from './roles.service'
import { UserPermission } from './entities/user-permission.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, UserPermission])],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}