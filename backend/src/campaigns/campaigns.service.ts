import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { CreateCampaignDto } from './dto/create-campaign.dto'
import { UpdateCampaignDto } from './dto/update-campaign.dto'
import { Campaign } from './entities/campaign.entity'
import { Indicator } from './entities/indicator.entity'
import { CampaignUser } from './entities/campaign-user.entity'

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Indicator)
    private readonly indicatorRepository: Repository<Indicator>,
    @InjectRepository(CampaignUser)
    private readonly campaignUserRepository: Repository<CampaignUser>,
  ) {}

  async create(createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const existing = await this.campaignRepository.findOne({
      where: { name: createCampaignDto.name },
    })
    if (existing) {
      throw new ConflictException(`Ya existe una campaña con el nombre "${createCampaignDto.name}"`)
    }

    const indicators = createCampaignDto.indicadores.map((dto) =>
      this.indicatorRepository.create(dto),
    )

    const campaign = this.campaignRepository.create({
      name:        createCampaignDto.name,
      prompt:      createCampaignDto.prompt,
      imageUrl:    createCampaignDto.imageUrl,
      isActive:    createCampaignDto.isActive ?? true,
      indicadores: indicators,
    })

    const saved = await this.campaignRepository.save(campaign)

    // Guardar usuarios permitidos
    if (createCampaignDto.allowedUserIds && createCampaignDto.allowedUserIds.length > 0) {
      await this.syncCampaignUsers(saved.id, createCampaignDto.allowedUserIds)
    }

    return this.findOneWithUsers(saved.id)
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignRepository.find()
  }

  /** Devuelve campañas a las que el usuario tiene acceso */
  async findAllForUser(userId: string, isAdmin: boolean): Promise<Campaign[]> {
    if (isAdmin) {
      return this.findAllWithUsers()
    }

    // Obtener IDs de campañas permitidas para este usuario
    const allowedCampaignIds = await this.getAllowedCampaignIds(userId)

    if (allowedCampaignIds.length === 0) {
      return []
    }

    return this.campaignRepository.find({
      where: { id: In(allowedCampaignIds) },
      relations: ['campaignUsers', 'campaignUsers.user'],
    })
  }

  async findAllWithUsers(): Promise<Campaign[]> {
    return this.campaignRepository.find({
      relations: ['campaignUsers', 'campaignUsers.user'],
    })
  }

  async findAllActive(): Promise<Campaign[]> {
    return this.campaignRepository.find({ where: { isActive: true } })
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } })
    if (!campaign) {
      throw new NotFoundException(`Campaña con id "${id}" no encontrada`)
    }
    return campaign
  }

  async findOneWithUsers(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['campaignUsers', 'campaignUsers.user'],
    })
    if (!campaign) {
      throw new NotFoundException(`Campaña con id "${id}" no encontrada`)
    }
    return campaign
  }

  /** Verifica si un usuario tiene acceso a una campaña */
  async userHasAccess(userId: string, campaignId: string, isAdmin: boolean): Promise<boolean> {
    if (isAdmin) return true
    const cu = await this.campaignUserRepository.findOne({
      where: { campaign: { id: campaignId }, user: { id: userId } },
    })
    return !!cu
  }

  /** Obtiene los IDs de campañas a las que el usuario tiene acceso */
  async getAllowedCampaignIds(userId: string): Promise<string[]> {
    const entries = await this.campaignUserRepository.find({
      where: { user: { id: userId } },
      relations: ['campaign'],
    })
    return entries.map((e) => e.campaign.id)
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id)

    if (updateCampaignDto.name && updateCampaignDto.name !== campaign.name) {
      const existing = await this.campaignRepository.findOne({
        where: { name: updateCampaignDto.name },
      })
      if (existing) {
        throw new ConflictException(`Ya existe una campaña con el nombre "${updateCampaignDto.name}"`)
      }
      campaign.name = updateCampaignDto.name
    }

    if (updateCampaignDto.prompt !== undefined) {
      campaign.prompt = updateCampaignDto.prompt
    }

    if (updateCampaignDto.imageUrl !== undefined) {
      campaign.imageUrl = updateCampaignDto.imageUrl
    }

    if (updateCampaignDto.isActive !== undefined) {
      campaign.isActive = updateCampaignDto.isActive
    }

    if (updateCampaignDto.indicadores !== undefined) {
      await this.indicatorRepository.delete({ campaign: { id } })
      campaign.indicadores = updateCampaignDto.indicadores.map((dto) =>
        this.indicatorRepository.create(dto),
      )
    }

    await this.campaignRepository.save(campaign)

    // Sincronizar usuarios permitidos si se proporcionan
    if (updateCampaignDto.allowedUserIds !== undefined) {
      await this.syncCampaignUsers(id, updateCampaignDto.allowedUserIds)
    }

    return this.findOneWithUsers(id)
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id)
    await this.campaignRepository.remove(campaign)
  }

  // ── Helpers internos ─────────────────────────────────────────────────────

  private async syncCampaignUsers(campaignId: string, userIds: string[]): Promise<void> {
    // Eliminar todos los registros actuales
    await this.campaignUserRepository.delete({ campaign: { id: campaignId } })

    // Crear nuevos registros
    if (userIds.length > 0) {
      const entries = userIds.map((userId) =>
        this.campaignUserRepository.create({
          campaign: { id: campaignId } as any,
          user: { id: userId } as any,
        }),
      )
      await this.campaignUserRepository.save(entries)
    }
  }
}
