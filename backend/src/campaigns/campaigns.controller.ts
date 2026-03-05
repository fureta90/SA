import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import sharp from 'sharp'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Permissions } from '../common/decorators/permissions.decorator'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { CampaignsService } from './campaigns.service'
import { CreateCampaignDto } from './dto/create-campaign.dto'
import { UpdateCampaignDto } from './dto/update-campaign.dto'
import { Campaign } from './entities/campaign.entity'
import { RolesService } from '../roles/roles.service'

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'campaigns')

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly rolesService: RolesService,
  ) {}

  // ── Helper: determinar si el usuario es admin ──────────────────────────────

  private async isUserAdmin(req: any): Promise<boolean> {
    const userId = req.user?.userId ?? req.user?.sub
    const emailLower = (req.user?.email || '').toString().toLowerCase()

    if (!userId) return false

    try {
      const roles = await this.rolesService.findRolesByUserId(userId)
      const isAdminByRole = roles.some((r: any) => {
        const nameLower = (r?.name || '').toString().toLowerCase()
        return nameLower.includes('admin') || nameLower.includes('administrador')
      })
      if (isAdminByRole) return true
    } catch {}

    if (
      emailLower.includes('admin') ||
      emailLower === 'lucas.domenica33@gmail.com' ||
      emailLower === 'fureta@findcontrol.info'
    ) {
      return true
    }

    return false
  }

  private getUserId(req: any): string {
    return req.user?.userId ?? req.user?.sub ?? ''
  }

  // ── Upload imagen ──────────────────────────────────────────────────────────

  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir imagen de campaña' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Imagen subida y redimensionada' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
          cb(null, UPLOAD_DIR)
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
          cb(null, `${unique}${extname(file.originalname)}`)
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|jpg|webp|gif)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes'), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió archivo')

    const outFilename = `resized-${file.filename.replace(/\.[^.]+$/, '')}.png`
    const outPath = join(UPLOAD_DIR, outFilename)

    await sharp(file.path)
      .trim({ threshold: 80 })
      .resize(500, 280, {
        fit: 'contain',
        position: 'centre',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outPath)

    unlinkSync(file.path)
    return { url: `/uploads/campaigns/${outFilename}` }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('add_campaigns')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear una nueva campaña' })
  @ApiBody({ type: CreateCampaignDto })
  @ApiResponse({ status: 201, description: 'Campaña creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o campaña ya existente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para crear campañas' })
  create(@Body() createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    return this.campaignsService.create(createCampaignDto)
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_campaigns', 'view_analytics', 'add_campaigns', 'update_campaigns', 'delete_campaigns')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener campañas del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de campañas obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para ver campañas' })
  async findAll(@Req() req: any): Promise<Campaign[]> {
    const userId = this.getUserId(req)
    const isAdmin = await this.isUserAdmin(req)
    return this.campaignsService.findAllForUser(userId, isAdmin)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_campaigns', 'view_analytics', 'add_campaigns', 'update_campaigns', 'delete_campaigns')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener una campaña por ID' })
  @ApiParam({ name: 'id', description: 'ID de la campaña' })
  @ApiResponse({ status: 200, description: 'Campaña encontrada' })
  @ApiResponse({ status: 404, description: 'Campaña no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para ver campañas' })
  findOne(@Param('id') id: string): Promise<Campaign> {
    return this.campaignsService.findOneWithUsers(id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('update_campaigns')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar una campaña' })
  @ApiParam({ name: 'id', description: 'ID de la campaña' })
  @ApiBody({ type: UpdateCampaignDto })
  @ApiResponse({ status: 200, description: 'Campaña actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Campaña no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para modificar campañas' })
  update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ): Promise<Campaign> {
    return this.campaignsService.update(id, updateCampaignDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('delete_campaigns')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar una campaña' })
  @ApiParam({ name: 'id', description: 'ID de la campaña' })
  @ApiResponse({ status: 200, description: 'Campaña eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Campaña no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para eliminar campañas' })
  remove(@Param('id') id: string): Promise<void> {
    return this.campaignsService.remove(id)
  }
}
