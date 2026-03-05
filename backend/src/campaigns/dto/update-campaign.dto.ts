import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'

export class UpdateIndicadorDto {
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

export class UpdateCampaignDto {
  @ApiProperty({ example: 'Atención al cliente', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string

  @ApiProperty({ example: 'Eres un evaluador de calidad...', required: false })
  @IsString()
  @IsOptional()
  prompt?: string

  @ApiProperty({ type: [UpdateIndicadorDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateIndicadorDto)
  indicadores?: UpdateIndicadorDto[]

  @ApiProperty({ example: 'https://...', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiProperty({ example: ['uuid-1', 'uuid-2'], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  allowedUserIds?: string[]
}