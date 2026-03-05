import { IsString, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: 'Nombre del rol', example: 'Administrador' })
  @IsString()
  @IsNotEmpty()
  name: string;

  // En esta BD, los IDs de permissions son GUID (uniqueidentifier).
  @ApiProperty({
    description: 'IDs (GUID) de los permisos asignados al rol',
    example: ['C909DFC4-7EA2-4063-805B-4F514CBBFD6C'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
