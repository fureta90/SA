import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendPasswordReset(email: string, link: string) {
  const baseUrl = this.configService.getOrThrow<string>('URL_APP');
  const logoUrl = `${baseUrl.replace(/\/$/, '')}/logo-FindControl/Logo_FindControl_Completo_Blanco_300.png`;

  await this.mailerService.sendMail({
    
    to: email,
    subject: 'Restablecer contraseña - FindControl',
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer contraseña</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Open Sans', Arial, sans-serif; background-color: #f1f5f9;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                
                <!-- Header con gradiente -->
                <tr>
                  <td style="background: linear-gradient(90deg, #42A1F1 0%, #6DE99A 100%); padding: 32px 40px; text-align: center;">
                    <img src="${logoUrl}" alt="FindControl" style="max-width: 180px; height: auto; filter: brightness(0) invert(1);">
                  </td>
                </tr>
                
                <!-- Contenido principal -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Icono -->
                    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                      <tr>
                        <td style="text-align: center;">
                          <div style="width: 64px; height: 64px; margin: 0 auto; background: linear-gradient(135deg, #2c92e6, #0c4b9b); border-radius: 12px; line-height: 64px; text-align: center;">
                            <span style="font-size: 28px;">🔐</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Título -->
                    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #0c4b9b; text-align: center;">
                      Restablecer Contraseña
                    </h1>
                    
                    <!-- Mensaje -->
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569; text-align: center;">
                      Recibimos una solicitud para restablecer la contraseña de tu cuenta en FindControl. 
                      Hacé click en el botón de abajo para crear una nueva contraseña.
                    </p>
                    
                    <!-- Botón CTA -->
                    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${link}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #42A1F1 0%, #6DE99A 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 0;">
                            Restablecer Contraseña
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Aviso de expiración -->
                    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                      <tr>
                        <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px;">
                          <p style="margin: 0; font-size: 13px; color: #92400e;">
                            <strong>⏱️ Importante:</strong> Este enlace expira en <strong>15 minutos</strong> por seguridad.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Link alternativo -->
                    <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; text-align: center;">
                      Si el botón no funciona, copiá y pegá este enlace en tu navegador:
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #2c92e6; text-align: center; word-break: break-all;">
                      <a href="${link}" style="color: #2c92e6; text-decoration: underline;">${link}</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Separador -->
                <tr>
                  <td style="padding: 0 40px;">
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
                  </td>
                </tr>
                
                <!-- Aviso de seguridad -->
                <tr>
                  <td style="padding: 24px 40px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #94a3b8; text-align: center;">
                      Si no solicitaste restablecer tu contraseña, podés ignorar este correo. 
                      Tu cuenta permanecerá segura.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #0c4b9b;">
                            FindControl
                          </p>
                          <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                            Sistema de Control de Accesos
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
              
              <!-- Texto legal fuera del card -->
              <table role="presentation" style="max-width: 560px; margin: 20px auto 0;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      Este es un correo automático, por favor no respondas a este mensaje.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
}
