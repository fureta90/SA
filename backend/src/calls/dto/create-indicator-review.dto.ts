import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateIndicatorReviewDto {
  @ApiProperty({ description: 'Nombre del indicador (para legibilidad del historial)' })
  @IsString()
  indicadorNombre: string

  @ApiProperty({ description: '¿El indicador cumple? (revisión del auditor)' })
  @IsBoolean()
  valorNuevoCumple: boolean

  @ApiProperty({ description: 'Puntaje asignado por el auditor' })
  @IsNumber()
  @Min(-10)
  @Max(10)
  valorNuevoPuntaje: number

  @ApiPropertyOptional({ description: 'Nota o justificación del auditor' })
  @IsOptional()
  @IsString()
  nota?: string
}