import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateCallDto {
  @ApiProperty({ description: 'ID de la campaña' })
  @IsString()
  campaignId: string

  @ApiProperty({ description: 'Nombre del archivo de grabación' })
  @IsString()
  nombreGrabacion: string

  @ApiPropertyOptional({ description: 'Usuario/agente que realizó la llamada' })
  @IsOptional()
  @IsString()
  usuarioLlamada?: string

  @ApiPropertyOptional({ description: 'Fecha y hora de inicio de la llamada (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  fechaInicioLlamada?: string

  @ApiPropertyOptional({ description: 'Fecha y hora de fin de la llamada (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  fechaFinLlamada?: string

  @ApiPropertyOptional({ description: 'ID externo de la llamada' })
  @IsOptional()
  @IsString()
  idLlamada?: string

  @ApiPropertyOptional({ description: 'ID del contacto' })
  @IsOptional()
  @IsString()
  idContacto?: string

  @ApiPropertyOptional({ description: 'Duración en segundos' })
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  @IsNumber()
  duracionSegundos?: number

  // ── v9.4.1: dirección de la llamada ──────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Dirección de la llamada: entrante (cliente llamó al banco) o saliente (agente llamó al cliente)',
    enum: ['entrante', 'saliente'],
    example: 'saliente',
  })
  @IsOptional()
  @IsIn(['entrante', 'saliente'])
  tipoLlamada?: 'entrante' | 'saliente'
}