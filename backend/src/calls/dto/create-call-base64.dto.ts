import { ApiProperty } from '@nestjs/swagger'
import { IsBase64, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateCallBase64Dto {
  @ApiProperty() @IsUUID() @IsNotEmpty()
  campaignId: string

  @ApiProperty() @IsString() @IsNotEmpty()
  nombreGrabacion: string

  @ApiProperty({ description: 'Audio en base64', example: 'UklGRiQAAABXQVZFZm10IBAAAA...' })
  @IsString() @IsNotEmpty()
  audioBase64: string

  @ApiProperty({ description: 'Extensión del archivo', example: 'mp3', default: 'mp3' })
  @IsString() @IsOptional()
  audioExtension?: string  // 'mp3' | 'wav' | 'ogg' etc

  @ApiProperty({ required: false }) @IsString() @IsOptional()
  usuarioLlamada?: string

  @ApiProperty({ required: false }) @IsDateString() @IsOptional()
  fechaInicioLlamada?: string

  @ApiProperty({ required: false }) @IsDateString() @IsOptional()
  fechaFinLlamada?: string

  @ApiProperty({ required: false }) @IsString() @IsOptional()
  idLlamada?: string

  @ApiProperty({ required: false }) @IsString() @IsOptional()
  idContacto?: string

  @ApiProperty({ required: false })
  @IsNumber() @IsOptional() @Type(() => Number)
  duracionSegundos?: number

  @ApiProperty({
      description: 'Dirección de la llamada: entrante (cliente llamó al banco) o saliente (agente llamó al cliente)',
      enum: ['entrante', 'saliente'],
      example: 'saliente',
    })
    @IsOptional()
    @IsIn(['entrante', 'saliente'])
    tipoLlamada?: 'entrante' | 'saliente'
}