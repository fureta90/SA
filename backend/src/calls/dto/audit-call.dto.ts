import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class AuditCallDto {
  @ApiPropertyOptional({ description: 'Nota opcional del auditor al marcar como auditada' })
  @IsOptional()
  @IsString()
  nota?: string
}