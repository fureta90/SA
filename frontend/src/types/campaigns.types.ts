// ─────────────────────────────────────────────────────────────────────────────
// campaigns.types.ts — v9.3.0
//
// Condiciones simplificadas: solo las OBJETIVAS y DETERMINÍSTICAS que el
// worker Python puede evaluar con certeza mirando los flags del contexto.
//
// Las condiciones SEMÁNTICAS (impedimento económico, si el cliente objetó,
// casos edge de negocio) ya no van en este dropdown — se escriben
// directamente en la DESCRIPCIÓN del indicador con el formato:
//
//   CONDICIÓN DE ACTIVACIÓN: Solo evaluar si [condición]...
//   NO APLICA si: [casos]...
//   CUMPLE si: [criterio positivo]...
//   NO CUMPLE si: [criterio negativo]...
//
// Gemini lee la descripción y decide aplica=true/false por sí solo.
// Así podés agregar cualquier escenario nuevo (ventas, retención,
// atención al cliente) solo cambiando la descripción — sin tocar código.
// ─────────────────────────────────────────────────────────────────────────────

export type CondicionIndicador =
  // ── General (cualquier tipo de campaña) ──────────────────
  | 'SIEMPRE'
  | 'SOLO_LLAMADA_ENTRANTE'
  | 'SOLO_LLAMADA_SALIENTE'
  | 'SOLO_SI_HAY_ACUERDO'
  | 'SOLO_SI_ES_FAMILIAR'
  // ── Cobranzas (condiciones objetivas de producto/pago) ───
  | 'SOLO_SI_NO_HAY_PAGO_DIRECTO'
  | 'SOLO_SI_TIENE_TARJETA_CREDITO'
  | 'SOLO_SI_PAGA_MINIMO_TARJETA'

export const CONDICIONES_INDICADOR: {
  value:  CondicionIndicador
  label:  string
  grupo:  string
  hint?:  string
}[] = [
  // ── General ───────────────────────────────────────────────────────────────
  {
    value: 'SIEMPRE',
    label: 'Siempre',
    grupo: 'General',
    hint:  'El indicador se evalúa en todas las llamadas',
  },
  {
    value: 'SOLO_LLAMADA_ENTRANTE',
    label: 'Solo llamada entrante',
    grupo: 'General',
    hint:  'El cliente llamó al agente',
  },
  {
    value: 'SOLO_LLAMADA_SALIENTE',
    label: 'Solo llamada saliente',
    grupo: 'General',
    hint:  'El agente llamó al cliente',
  },
  {
    value: 'SOLO_SI_HAY_ACUERDO',
    label: 'Solo si hay acuerdo / venta / compromiso',
    grupo: 'General',
    hint:  'El cliente se comprometió a algo (pago, compra, acción)',
  },
  {
    value: 'SOLO_SI_ES_FAMILIAR',
    label: 'Solo si atiende un familiar o tercero',
    grupo: 'General',
    hint:  'Quien habla no es el titular del contrato',
  },

  // ── Cobranzas ─────────────────────────────────────────────────────────────
  {
    value: 'SOLO_SI_NO_HAY_PAGO_DIRECTO',
    label: 'Solo si no confirma pago del total',
    grupo: 'Cobranzas',
    hint:  'El cliente no va a pagar el monto total directamente',
  },
  {
    value: 'SOLO_SI_TIENE_TARJETA_CREDITO',
    label: 'Solo si el producto es tarjeta de crédito',
    grupo: 'Cobranzas',
    hint:  'La deuda en mora corresponde a una tarjeta de crédito',
  },
  {
    value: 'SOLO_SI_PAGA_MINIMO_TARJETA',
    label: 'Solo si acepta pagar el mínimo de la tarjeta',
    grupo: 'Cobranzas',
    hint:  'El cliente aceptó explícitamente pagar el mínimo',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// NOTA PARA EL FORMULARIO:
// Si necesitás una condición semántica que no está en esta lista
// (ej: "solo si el cliente tiene dificultad económica", "solo si objetó"),
// NO la agregues aquí — escribila en la DESCRIPCIÓN del indicador:
//
//   CONDICIÓN DE ACTIVACIÓN: Solo evaluar si el cliente manifestó
//   explícitamente que no puede pagar por razones económicas...
//
// Gemini la interpreta automáticamente.
// ─────────────────────────────────────────────────────────────────────────────

export interface Indicator {
  id?:              string
  INDICADOR:        string
  Puntaje_Si_Hace:  number
  Puntaje_No_Hace:  number
  descripcion:      string
  condicion:        CondicionIndicador | ''
}

export interface CampaignUser {
  id:   string
  user: {
    id:        string
    email:     string
    firstName: string
    lastName:  string
    usuario:   string
  }
  createdAt: string
}

export interface Campaign {
  id:        string
  name:      string
  prompt:    string
  imageUrl?: string
  isActive:  boolean
  createdAt: string
  updatedAt: string
  indicadores:   Indicator[]
  campaignUsers?: CampaignUser[]
  // ── Límite de minutos ──────────────────────────────────────────────────
  minutesLimitEnabled: boolean
  minutesLimit:        number | null
  minutesConsumed:     number
}

export interface MinutesSummary {
  minutesLimitEnabled: boolean
  minutesLimit:        number | null
  minutesConsumed:     number
  minutesRemaining:    number | null
  percentUsed:         number | null
  limitReached:        boolean
}

export interface CreateCampaignDto {
  name:           string
  prompt?:        string
  imageUrl?:      string
  isActive?:      boolean
  indicadores:    Omit<Indicator, 'id'>[]
  allowedUserIds?: string[]
  // ── Límite de minutos ──────────────────────────────────────────────────
  minutesLimitEnabled?: boolean
  minutesLimit?:        number | null
}

export interface UpdateCampaignDto {
  name?:          string
  prompt?:        string
  imageUrl?:      string
  isActive?:      boolean
  indicadores?:   Omit<Indicator, 'id'>[]
  allowedUserIds?: string[]
  // ── Límite de minutos ──────────────────────────────────────────────────
  minutesLimitEnabled?: boolean
  minutesLimit?:        number | null
}