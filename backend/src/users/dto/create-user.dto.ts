import { IsEmail, IsString, IsOptional, MinLength, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@example.com',
  })
  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
    minLength: 6,
  })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiPropertyOptional({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido del usuario',
    example: 'Pérez',
  })
  @IsOptional()
  @IsString({ message: 'El apellido debe ser un texto' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Empresa del usuario',
    example: 'Empresa ABC',
  })
  @IsOptional()
  @IsString({ message: 'La empresa debe ser un texto' })
  empresa?: string;

  @ApiPropertyOptional({
    description: 'Usuario (username)',
    example: 'jperez',
  })
  @IsOptional()
  @IsString({ message: 'El usuario debe ser un texto' })
  usuario?: string;

  @ApiPropertyOptional({
    description: 'Foto de perfil (URL o data URL/base64)',
    example: 'data:image/png;base64,iVBORw0KGgoAAA...',
  })
  @IsOptional()
  @IsString({ message: 'La foto de perfil debe ser un texto' })
  photoUrl?: string;

  @ApiPropertyOptional({
    description: 'Estado activo del usuario',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un booleano' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de los roles/perfiles asignados al usuario',
    example: ['79194B6C-72E5-4FA4-91A6-FBCD50B837A7'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'profileIds debe ser un array' })
  @IsString({ each: true, message: 'Cada elemento de profileIds debe ser un string (GUID)' })
  profileIds?: string[];
}
