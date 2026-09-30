// Tipos espelhando o schema de supabase/migrations/0001_initial_schema.sql
// (só os campos usados pelo app até a Semana 2-3).

export type Papel = 'cliente' | 'profissional' | 'parceiro' | 'admin'

export interface Profile {
  id: string
  nome: string | null
  whatsapp: string | null
  foto_url: string | null
  papeis: Papel[]
  cidade_id: string | null
  status: 'ativo' | 'suspenso' | 'excluido'
}

export type DocsStatus = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado'

export interface ProfessionalProfile {
  user_id: string
  bio: string | null
  categorias: string[]
  bairros: string[]
  verificado: boolean
  verificado_em: string | null
  docs_status: DocsStatus
  chave_pix: string | null
  score: number
  nota_media: number
  total_avaliacoes: number
  obras_concluidas: number
  destaque_ate: string | null
  created_at: string
}

export interface Category {
  id: string
  nome: string
  slug: string
  tipo: 'servico' | 'lead'
  ativa: boolean
  ordem: number
}

export interface Neighborhood {
  id: string
  city_id: string
  nome: string
}

export interface PortfolioItem {
  id: string
  professional_id: string
  foto_url: string
  descricao: string | null
  categoria_id: string | null
}

// ─── Semana 4: pedidos, chat, propostas ────────────────────────────────

export type RequestStatus = 'aberto' | 'em_atendimento' | 'concluido' | 'cancelado'

export interface ServiceRequest {
  id: string
  cliente_id: string
  categoria_id: string
  descricao: string
  fotos: string[]
  bairro_id: string | null
  prazo: string | null
  status: RequestStatus
  created_at: string
}

export type TargetStatus = 'enviado' | 'visualizado' | 'recusado' | 'proposta_enviada'

export interface RequestTarget {
  request_id: string
  professional_id: string
  status: TargetStatus
  created_at: string
}

export interface Conversation {
  id: string
  request_id: string | null
  cliente_id: string
  professional_id: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  autor_id: string
  tipo: 'texto' | 'foto' | 'proposta'
  conteudo: string | null
  criado_em: string
}

export type ProposalStatus = 'enviada' | 'aceita' | 'recusada' | 'expirada'

export interface Proposal {
  id: string
  conversation_id: string
  valor_total: number
  prazo_dias: number
  material_por: 'cliente' | 'profissional' | 'combinado' | null
  observacoes: string | null
  status: ProposalStatus
  created_at: string
}

export interface ProposalStage {
  id: string
  proposal_id: string
  ordem: number
  descricao: string
  valor: number
}

export type JobStatus = 'em_andamento' | 'concluida' | 'cancelada' | 'em_disputa'

export interface Job {
  id: string
  proposal_id: string
  cliente_id: string
  professional_id: string
  status: JobStatus
  comprovante_hash: string | null
  iniciado_em: string
  concluido_em: string | null
}

export type JobStageStatus =
  | 'aguardando_pagamento'
  | 'paga_retida'
  | 'concluida_aguardando'
  | 'aprovada'
  | 'liberada'
  | 'contestada'
  | 'reembolsada'

export interface JobStage {
  id: string
  job_id: string
  ordem: number
  descricao: string
  valor: number
  status: JobStageStatus
  fotos_conclusao: string[]
  prazo_aprovacao: string | null
}

// ─── Semana 5-6: Pagamento Garantido simulado ──────────────────────────

export type PaymentStatus =
  | 'pendente'
  | 'pago_retido'
  | 'liberado'
  | 'reembolsado'
  | 'falhou'
  | 'expirado'

export interface Payment {
  id: string
  stage_id: string
  provider: string
  metodo: 'pix' | 'cartao'
  valor: number
  taxa_plataforma: number
  valor_liquido: number
  status: PaymentStatus
  simulado: boolean
  criado_em: string
  pago_em: string | null
  liberado_em: string | null
}

export type LedgerEntryTipo = 'credito_retido' | 'credito_liberado' | 'taxa' | 'estorno'

export interface LedgerEntry {
  id: string
  user_id: string
  payment_id: string
  tipo: LedgerEntryTipo
  valor: number
  simulado: boolean
  criado_em: string
}

export interface Dispute {
  id: string
  stage_id: string
  aberta_por: string
  motivo: string
  fotos: string[]
  decisao: 'liberar' | 'reembolsar' | 'dividir' | null
  valor_cliente: number | null
  valor_profissional: number | null
  resolvida_em: string | null
  created_at: string
}
