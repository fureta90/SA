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
}