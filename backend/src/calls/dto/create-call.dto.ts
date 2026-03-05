import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator'
import { Type } from 'class-transformer'
export class CreateCallDto {
  @ApiProperty() @IsUUID() @IsNotEmpty()
  campaignId: string

  @ApiProperty() @IsString() @IsNotEmpty()
  nombreGrabacion: string

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

  // en el campo duracionSegundos:
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)          // ← convierte string → number en multipart
  duracionSegundos?: number
}