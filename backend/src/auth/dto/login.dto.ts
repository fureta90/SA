import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/* se utiliza npm install class-validator class-transformer
para validar los datos de entrada
*/

export class LoginDto {
  @ApiProperty({
    description: 'Email o nombre de usuario del usuario',
    example: 'usuario@example.com o mi_usuario',
  })
  @IsString({ message: 'El identificador debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El identificador es obligatorio' })
  identifier: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
