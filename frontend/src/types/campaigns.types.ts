export type CondicionIndicador =
  | 'SIEMPRE'
  | 'SOLO_SI_HAY_ACUERDO'
  | 'SOLO_LLAMADA_ENTRANTE'
  | 'SOLO_LLAMADA_SALIENTE'
  | 'SOLO_SI_TIENE_TARJETA_CREDITO'
  | 'SOLO_SI_NO_PUEDE_PAGAR'

export const CONDICIONES_INDICADOR: { value: CondicionIndicador; label: string }[] = [
  { value: 'SIEMPRE',                       label: 'Siempre' },
  { value: 'SOLO_SI_HAY_ACUERDO',           label: 'Solo si hay acuerdo' },
  { value: 'SOLO_LLAMADA_ENTRANTE',         label: 'Solo llamada entrante' },
  { value: 'SOLO_LLAMADA_SALIENTE',         label: 'Solo llamada saliente' },
  { value: 'SOLO_SI_TIENE_TARJETA_CREDITO', label: 'Solo si tiene tarjeta de crédito' },
  { value: 'SOLO_SI_NO_PUEDE_PAGAR',        label: 'Solo si no puede pagar' },
]

export interface Indicator {
  id?: string
  INDICADOR: string
  Puntaje_Si_Hace: number
  Puntaje_No_Hace: number
  descripcion: string
  condicion: CondicionIndicador | ''
}

export interface CampaignUser {
  id: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    usuario: string
  }
  createdAt: string
}

export interface Campaign {
  id: string
  name: string
  prompt: string
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  indicadores: Indicator[]
  campaignUsers?: CampaignUser[]
}

export interface CreateCampaignDto {
  name: string
  prompt?: string
  imageUrl?: string
  isActive?: boolean
  indicadores: Omit<Indicator, 'id'>[]
  allowedUserIds?: string[]
}

export interface UpdateCampaignDto {
  name?: string
  prompt?: string
  imageUrl?: string
  isActive?: boolean
  indicadores?: Omit<Indicator, 'id'>[]
  allowedUserIds?: string[]
}