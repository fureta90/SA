import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator'

export class CreateIndicadorDto {
  @ApiProperty({ example: 'Saludo cordial' })
  @IsString()
  @IsNotEmpty()
  INDICADOR: string

  @ApiProperty({ example: 1 })
  @IsNumber()
  Puntaje_Si_Hace: number

  @ApiProperty({ example: -1 })
  @IsNumber()
  Puntaje_No_Hace: number

  @ApiProperty({ example: 'El agente saluda de manera cordial', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string

  @ApiProperty({ example: 'SIEMPRE', required: false })
  @IsString()
  @IsOptional()
  condicion?: string
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Atención al cliente' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ example: 'Eres un evaluador de calidad...', required: false })
  @IsString()
  @IsOptional()
  prompt?: string

  @ApiProperty({ type: [CreateIndicadorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIndicadorDto)
  indicadores: CreateIndicadorDto[]

  @ApiProperty({ example: 'https://...', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiProperty({ example: ['uuid-1', 'uuid-2'], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  allowedUserIds?: string[]

  // ── Límite de minutos ────────────────────────────────────────────────────

  @ApiProperty({ example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  minutesLimitEnabled?: boolean

  @ApiProperty({ example: 500, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  minutesLimit?: number | null

  // ── Facturación y período ─────────────────────────────────────────────────

  @ApiProperty({ example: 0.05, required: false, description: 'Precio por minuto para esta campaña' })
  @IsNumber()
  @IsOptional()
  pricePerMinute?: number | null

  @ApiProperty({ example: '2025-06-01T00:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  periodStartDate?: string | null

  @ApiProperty({ example: 30, required: false, default: 30 })
  @IsNumber()
  @IsOptional()
  periodDays?: number
}