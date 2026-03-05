import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [UsersModule, RolesModule], /* se importan los módulos necesarios */
  controllers: [ProfileController], /* se registran los controladores */
})
export class ProfileModule {} /* se exporta el módulo */
