import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from '../mail/dto/forgot-password.dto';
import { ResetPasswordConfirmDto } from './dto/reset-password-confirm.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Verificar estado del módulo de autenticación' })
  @ApiResponse({ status: 200, description: 'Módulo funcionando correctamente' })
  test() {
    return { message: 'Auth module is working', endpoint: '/auth/login (POST)' };
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Login exitoso',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.identifier, loginDto.password);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar reestablecimiento de contraseña' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Correo de reestablecimiento enviado con éxito' })
  @ApiResponse({ status: 404, description: 'No existe un usuario registrado con este correo electrónico' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email, forgotPasswordDto.googleIdToken);
  }

  @Post('google-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con Google' })
  @ApiBody({ schema: { type: 'object', properties: { idToken: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Login con Google exitoso' })
  @ApiResponse({ status: 401, description: 'Token de Google inválido' })
  @ApiResponse({ status: 404, description: 'Usuario no registrado con Google' })
  async googleLogin(@Body('idToken') idToken: string) {
    return this.authService.googleLogin(idToken);
  }

  @Post('reset-password-confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar restablecimiento de contraseña' })
  @ApiBody({ type: ResetPasswordConfirmDto })
  @ApiResponse({ status: 200, description: 'Contraseña restablecida con éxito' })
  @ApiResponse({ status: 401, description: 'Token de restablecimiento inválido o expirado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado o token no válido' })
  async resetPasswordConfirm(@Body() resetPasswordConfirmDto: ResetPasswordConfirmDto) {
    const { resetToken, newPassword } = resetPasswordConfirmDto;
    return this.authService.resetPasswordConfirm(resetToken, newPassword);
  }
}
