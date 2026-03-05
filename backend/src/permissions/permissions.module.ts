import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [RolesModule],
  controllers: [PermissionsController],
})
export class PermissionsModule {}
