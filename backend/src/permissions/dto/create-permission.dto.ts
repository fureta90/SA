import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Nombre del permiso',
    example: 'Ver Dashboard',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Código del permiso (opcional, formato snake_case)',
    example: 'view_dashboard',
    required: false,
  })
  @IsString()
  @IsOptional()
  code?: string;
}
