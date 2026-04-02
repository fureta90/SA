import {
  Body, Controller, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags,
} from '@nestjs/swagger'
import { IsDateString, IsInt, IsNumber, IsOptional, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { BillingService } from './billing.service'
import { BillingPeriodService } from './billing-period.service'
import { RolesService } from '../roles/roles.service'
import { CampaignsService } from '../campaigns/campaigns.service'

class SetCampaignBillingDto {
  @ApiProperty({ example: 0.05, required: false })
  @IsNumber() @IsOptional() @Min(0)
  pricePerMinute: number | null

  @ApiProperty({ example: '2025-06-01T00:00:00.000Z', required: false })
  @IsDateString() @IsOptional()
  periodStartDate: string | null

  @ApiProperty({ example: 30, required: false, default: 30 })
  @IsInt() @IsOptional() @Min(1)
  periodDays?: number
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService:       BillingService,
    private readonly billingPeriodService: BillingPeriodService,
    private readonly rolesService:         RolesService,
    private readonly campaignsService:     CampaignsService,
  ) {}

  private async isUserAdmin(req: any): Promise<boolean> {
    const userId     = req.user?.userId ?? req.user?.sub
    const emailLower = (req.user?.email || '').toString().toLowerCase()
    if (!userId) return false
    try {
      const roles = await this.rolesService.findRolesByUserId(userId)
      if (roles.some((r: any) => (r?.name || '').toLowerCase().includes('admin'))) return true
    } catch {}
    return (
      emailLower.includes('admin') ||
      emailLower === 'lucas.domenica33@gmail.com' ||
      emailLower === 'fureta@findcontrol.info'
    )
  }

  private getUserId(req: any): string {
    return req.user?.userId ?? req.user?.sub ?? ''
  }

  private async requireAdmin(req: any): Promise<void> {
    if (!(await this.isUserAdmin(req))) {
      const { ForbiddenException } = await import('@nestjs/common')
      throw new ForbiddenException('Solo administradores')
    }
  }

  // ── Admin: resumen global de todas las campañas ───────────────────────────

  @Get('admin/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Resumen de facturación de todas las campañas' })
  async getAdminSummary(@Req() req: any) {
    await this.requireAdmin(req)
    return this.billingService.getAdminSummary()
  }

  // ── Admin: configurar precio y período de una campaña ────────────────────

  @Patch('admin/campaign/:campaignId/config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Configurar precio/min y período de una campaña' })
  @ApiParam({ name: 'campaignId' })
  @ApiBody({ type: SetCampaignBillingDto })
  async setCampaignConfig(
    @Req()               req: any,
    @Param('campaignId') campaignId: string,
    @Body()              dto: SetCampaignBillingDto,
  ) {
    await this.requireAdmin(req)
    await this.billingService.setCampaignBillingConfig(
      campaignId,
      dto.pricePerMinute   ?? null,
      dto.periodStartDate  ? new Date(dto.periodStartDate) : null,
      dto.periodDays       ?? 30,
    )
    return { ok: true }
  }

  // ── Admin: forzar renovación de una campaña ──────────────────────────────

  @Post('admin/campaign/:campaignId/renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Forzar renovación del período de una campaña' })
  @ApiParam({ name: 'campaignId' })
  async renewCampaign(@Req() req: any, @Param('campaignId') campaignId: string) {
    await this.requireAdmin(req)
    const result = await this.billingPeriodService.renewCampaignManual(campaignId)
    return { ok: true, ...result }
  }

  // ── Cliente: su propio resumen de campañas asignadas ─────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Cliente] Resumen de consumo de sus campañas' })
  async getMyBilling(@Req() req: any) {
    const userId  = this.getUserId(req)
    const isAdmin = await this.isUserAdmin(req)
    // Obtener IDs de campañas accesibles para este usuario
    const campaignIds = await this.campaignsService.getAllowedCampaignIds(userId)
    if (isAdmin) {
      // Admin ve todas
      const summary = await this.billingService.getAdminSummary()
      return summary
    }
    return this.billingService.getClientSummary(campaignIds)
  }
}