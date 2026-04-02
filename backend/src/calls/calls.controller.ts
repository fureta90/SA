import {
  Controller, Post, Get, Delete, Patch,
  Param, Body, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException, Req, HttpCode,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { Permissions } from '../common/decorators/permissions.decorator'
import { CallsService } from './calls.service'
import { CreateCallDto } from './dto/create-call.dto'
import { CreateCallBase64Dto } from './dto/create-call-base64.dto'
import { CreateIndicatorReviewDto } from './dto/create-indicator-review.dto'
import { AuditCallDto } from './dto/audit-call.dto'
import { CampaignsService } from '../campaigns/campaigns.service'
import { RolesService } from '../roles/roles.service'

const AUDIO_TEMP_DIR = join(process.cwd(), 'uploads', 'audio-temp')

@ApiTags('calls')
@Controller('calls')
export class CallsController {
  constructor(
    private readonly callsService: CallsService,
    private readonly campaignsService: CampaignsService,
    private readonly rolesService: RolesService,
  ) {}

  // ── WEBHOOK DE ANÁLISIS ASÍNCRONO ────────────────────────────────────────────

  /**
   * POST /calls/webhook/analysis-complete
   * Recibe la notificación de la API externa cuando un job termina.
   * El body puede incluir el job_id y metadata.callDbId para identificar la llamada.
   * No requiere JWT — la autenticación se hace por shared secret (opcional).
   */
  @Post('webhook/analysis-complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook: notificación de análisis completado' })
  async analysisWebhook(@Body() body: any) {
    const jobId    = body?.job_id    ?? body?.jobId
    const callDbId = body?.metadata?.callDbId ?? body?.callDbId

    if (!jobId) {
      return { ok: false, error: 'job_id requerido' }
    }

    if (!callDbId) {
      const call = await this.callsService.findByAnalysisJobId(jobId)
      if (call) {
        await this.callsService.handleWebhookResult(call.id, jobId)
        return { ok: true }
      }
      return { ok: false, error: 'No se encontró la llamada para este job_id' }
    }

    await this.callsService.handleWebhookResult(callDbId, jobId)
    return { ok: true }
  }

  /**
   * GET /calls/:id/job-status
   * Devuelve el estado actual del job de análisis para una llamada específica.
   */
  @Get(':id/job-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Estado del job de análisis asíncrono' })
  async getJobStatus(@Param('id') id: string) {
    return this.callsService.getAnalysisJobStatus(id)
  }

  @Post('base64')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('add_campaigns')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear registro de llamada con audio en base64' })
  async createFromBase64(@Body() dto: CreateCallBase64Dto) {
    console.log(JSON.stringify({
    dto,
    audioBase64: dto.audioBase64 ? `[BASE64 ${dto.audioBase64.length} chars]` : 'VACÍO'
  }, null, 2))
    return this.callsService.createFromBase64(dto)
  }

  // ── CRUD básico ──────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('add_campaigns')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear registro de llamada con audio' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(AUDIO_TEMP_DIR)) mkdirSync(AUDIO_TEMP_DIR, { recursive: true })
          cb(null, AUDIO_TEMP_DIR)
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
          cb(null, `${unique}${extname(file.originalname)}`)
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^audio\//)) {
          return cb(new BadRequestException('Solo se permiten archivos de audio'), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  async create(
    @UploadedFile() audio: Express.Multer.File,
    @Body() dto: CreateCallDto,
  ) {
    if (!audio) throw new BadRequestException('Se requiere archivo de audio')
    return this.callsService.create(dto, audio)
  }

  @Get('campaign/:campaignId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener llamadas de una campaña' })
  findByCampaign(@Param('campaignId') campaignId: string) {
    return this.callsService.findByCampaign(campaignId)
  }

  @Get('stats/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async dashboardStats(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub
    const emailLower = (req.user?.email || '').toString().toLowerCase()

    // Determinar si es admin
    let isAdmin = false
    if (userId) {
      try {
        const roles = await this.rolesService.findRolesByUserId(userId)
        isAdmin = roles.some((r: any) => {
          const n = (r?.name || '').toString().toLowerCase()
          return n.includes('admin') || n.includes('administrador')
        })
      } catch {}
    }
    if (!isAdmin && (emailLower.includes('admin') || emailLower === 'lucas.domenica33@gmail.com' || emailLower === 'fureta@findcontrol.info')) {
      isAdmin = true
    }

    if (isAdmin) {
      // Admin ve todo
      return this.callsService.getDashboardStats()
    }

    // Usuario normal: solo campañas permitidas
    const allowedIds = await this.campaignsService.getAllowedCampaignIds(userId)
    if (allowedIds.length === 0) {
      // Sin campañas asignadas → dashboard vacío
      return {
        campaigns: 0, total: 0, pending: 0, uploading: 0,
        uploaded: 0, analyzing: 0, analyzed: 0, errors: 0,
        recentCalls: [], campaignStats: [],
      }
    }
    return this.callsService.getDashboardStats(allowedIds)
  }

  @Get('stats/workers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Estado de los workers' })
  async workerStats() {
    return this.callsService.getWorkerStats()
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener una llamada por ID' })
  findOne(@Param('id') id: string) {
    return this.callsService.findOne(id)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('delete_campaigns')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar una llamada' })
  remove(@Param('id') id: string) {
    return this.callsService.remove(id)
  }

  @Post(':id/retry')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reintentar llamada en error' })
  retry(@Param('id') id: string) {
    return this.callsService.retryCall(id)
  }

  // ── AUDITORÍA ────────────────────────────────────────────────────────────────

  /**
   * PATCH /calls/:id/audit
   * Marca la llamada como AUDITED.
   * Registra quién la auditó y en qué fecha.
   */
  @Patch(':id/audit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Marcar grabación como auditada' })
  @ApiParam({ name: 'id', description: 'ID de la llamada' })
  @ApiBody({ type: AuditCallDto, required: false })
  async auditCall(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.userId ?? req.user?.sub ?? 'unknown'
    const nombre = req.user?.name ?? req.user?.email ?? req.user?.username ?? 'Auditor'
    return this.callsService.auditCall(id, { userId, nombre })
  }

  // ── REVISIONES DE INDICADORES ────────────────────────────────────────────────

  /**
   * POST /calls/:id/indicators/:index/review
   * El auditor guarda su revisión de un indicador específico.
   * El usuario autenticado queda registrado como auditor.
   */
  @Post(':id/indicators/:index/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Guardar revisión de auditor para un indicador' })
  @ApiParam({ name: 'id', description: 'ID de la llamada' })
  @ApiParam({ name: 'index', description: 'Índice del indicador (0-based)' })
  @ApiBody({ type: CreateIndicatorReviewDto })
  async saveReview(
    @Param('id') callId: string,
    @Param('index') index: string,
    @Body() dto: CreateIndicatorReviewDto,
    @Req() req: any,
  ) {
    const indicadorIndex = parseInt(index, 10)
    if (isNaN(indicadorIndex) || indicadorIndex < 0) {
      throw new BadRequestException('El índice del indicador debe ser un número positivo')
    }

    // Extraer datos del usuario del JWT
    const userId  = req.user?.userId ?? req.user?.sub ?? 'unknown'
    const nombre  = req.user?.name ?? req.user?.email ?? req.user?.username ?? 'Auditor'

    return this.callsService.saveIndicatorReview(callId, indicadorIndex, dto, {
      userId,
      nombre,
    })
  }

  /**
   * GET /calls/:id/reviews
   * Historial completo de todas las revisiones de una llamada.
   */
  @Get(':id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener historial de revisiones de una llamada' })
  @ApiParam({ name: 'id', description: 'ID de la llamada' })
  async getReviews(@Param('id') callId: string) {
    return this.callsService.getIndicatorReviews(callId)
  }

  /**
   * GET /calls/:id/reviews/latest
   * Última revisión por indicador (estado actual revisado).
   */
  @Get(':id/reviews/latest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener última revisión por indicador' })
  @ApiParam({ name: 'id', description: 'ID de la llamada' })
  async getLatestReviews(@Param('id') callId: string) {
    return this.callsService.getLatestReviewsPerIndicator(callId)
  }
}