import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private googleAuthClient: OAuth2Client;
  constructor(
    // ✅ CORREGIDO: UsersService se inyecta solo (siempre que importes UsersModule)
    private readonly usersService: UsersService,

    private readonly jwtService: JwtService,

    // ✅ CORREGIDO: Aquí SÍ va el decorador, porque es un repositorio de TypeORM
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.googleAuthClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async login(identifier: string, password: string) {
    let user: User | null = null;

    // Determinar si el identificador es un email o un username
    if (identifier.includes('@')) {
      user = await this.usersService.findByEmail(identifier);
    } else {
      // Necesitamos password para validar credenciales
      user = await this.usersService.findByUsuarioWithPassword(identifier);
    }

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async googleLogin(idToken: string) {
    const ticket = await this.googleAuthClient.verifyIdToken({
      idToken,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }
    const email = payload.email;
    if (!email) {
      throw new UnauthorizedException('Google token does not contain an email');
    }
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not registered with Google');
    }

    const jwtPayload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(jwtPayload),
    };
  }

  async forgotPassword(email: string, googleIdToken?: string) {
    let user: User | null = null;

    if (googleIdToken) {
      try {
        const ticket = await this.googleAuthClient.verifyIdToken({
          idToken: googleIdToken,
          audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
        });
        const payload = ticket.getPayload();
        if (!payload || payload.email !== email) {
          throw new UnauthorizedException('Invalid Google token or email mismatch');
        }
        user = await this.usersService.findByEmail(email);
      } catch (error) {
        throw new UnauthorizedException('Google authentication failed');
      }
    } else {
      user = await this.usersRepository.findOne({
        where: { email },
      });
    }

    if (!user) {
      throw new NotFoundException('El correo no está registrado');
    }

    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );

    // Si se autenticó con Google, no enviamos correo, sino que devolvemos el token
    if (googleIdToken) {
      return {
        message: 'Token de restablecimiento generado mediante Google',
        resetToken: token,
      };
    } else {
      const urlApp = this.configService.get<string>('URL_APP') ?? 'https://axium.findcontrol.info';
      const link = `${urlApp}/reset-password?token=${token}`;
      await this.mailService.sendPasswordReset(user.email, link);
      return {
        message: 'Se envió un correo para restablecer la contraseña',
      };
    }
  }

  async resetPasswordConfirm(resetToken: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(resetToken);

      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedException('Token de restablecimiento inválido');
      }

      const user = await this.usersService.findOne(payload.sub);

      if (!user || user.email !== payload.email) {
        throw new NotFoundException('Usuario no encontrado o token no válido para este email');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.usersRepository.update(user.id, { password: hashedPassword });

      return { message: 'Contraseña restablecida con éxito' };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token de restablecimiento expirado');
      }
      throw new UnauthorizedException('Token de restablecimiento inválido');
    }
  }
}