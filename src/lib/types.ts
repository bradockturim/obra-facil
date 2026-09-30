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
