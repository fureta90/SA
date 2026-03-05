import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) { /* se crea el constructor */  /* se inyecta el servicio de configuración */
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), /* se extrae el token del encabezado de la petición */
      ignoreExpiration: false, /* se ignora la expiración del token */
      secretOrKey: configService.get<string>('JWT_SECRET') as string, /* se obtiene la clave secreta del token */
    }); /* se crea el constructor */  
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
    }; /* se retorna el usuario autenticado */
  }
}
