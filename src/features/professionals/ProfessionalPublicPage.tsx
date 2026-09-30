import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, MessageCircle, ShieldCheck, Star } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LinkButton, Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import type { Category, Neighborhood, PortfolioItem, Profile, ProfessionalProfile, Review } from '@/lib/types'

interface FullProfile extends ProfessionalProfile {
  profiles: Profile | null
}

interface ReviewRow extends Review {
  profiles: Pick<Profile, 'nome'> | null
}

export function ProfessionalPublicPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select(
        'id, job_id, autor_id, alvo_id, qualidade, pontualidade, limpeza, comunicacao, nota_geral, comentario, fotos, resposta, publica, created_at, profiles!reviews_autor_id_fkey(nome)',
      )
      .eq('alvo_id', id)
      .eq('publica', true)
      .order('created_at', { ascending: false })
    setReviews((data as unknown as ReviewRow[]) ?? [])
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('professional_profiles')
        .select('*, profiles(id, nome, whatsapp, foto_url, papeis, cidade_id, status)')
        .eq('user_id', id)
        .maybeSingle()

      if (!data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const full = data as unknown as FullProfile
      setProfile(full)

      const [{ data: cats }, { data: neigh }, { data: items }] = await Promise.all([
        full.categorias.length
          ? supabase.from('categories').select('id, nome, slug, tipo, ativa, ordem').in('id', full.categorias)
          : Promise.resolve({ data: [] }),
        full.bairros.length
          ? supabase.from('neighborhoods').select('id, city_id, nome').in('id', full.bairros)
          : Promise.resolve({ data: [] }),
        supabase
          .from('portfolio_items')
          .select('id, professional_id, foto_url, descricao, categoria_id')
          .eq('professional_id', id),
      ])
      setCategories((cats as Category[]) ?? [])
      setNeighborhoods((neigh as Neighborhood[]) ?? [])
      setPortfolio((items as PortfolioItem[]) ?? [])
      await loadReviews()
      setLoading(false)
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <PageLoader />

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-slate-500">Profissional não encontrado.</p>
        <Link to="/" className="text-brand-600 underline">
          Voltar para a Home
        </Link>
      </div>
    )
  }

  const isOwner = user?.id === id

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {profile.profiles?.nome ?? 'Profissional'}
            </h1>
            {profile.verificado && (
              <Badge tone="success" className="mt-1.5">
                <ShieldCheck className="h-3 w-3" /> Verificado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-slate-600">
            <Star className="h-4 w-4 fill-brand-500 text-brand-500" />
            {profile.nota_media.toFixed(1)}
            <span className="text-slate-400">({profile.total_avaliacoes})</span>
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-slate-600">{profile.bio}</p>}

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge key={c.id} tone="brand">
                {c.nome}
              </Badge>
            ))}
          </div>
        )}

        {neighborhoods.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400">
            <MapPin className="h-4 w-4" /> Atende: {neighborhoods.map((n) => n.nome).join(', ')}
          </p>
        )}

        <LinkButton to={user ? `/profissionais/${id}/pedido` : '/login'} className="mt-6">
          <MessageCircle className="h-4 w-4" /> Pedir orçamento
        </LinkButton>
      </Card>

      {portfolio.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Portfólio</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {portfolio.map((item) => (
              <img
                key={item.id}
                src={item.foto_url}
                alt={item.descricao ?? 'Foto do portfólio'}
                className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200"
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Avaliações</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400">Ainda não há avaliações públicas.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} isOwner={isOwner} onReplied={loadReviews} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewCard({
  review,
  isOwner,
  onReplied,
}: {
  review: ReviewRow
  isOwner: boolean
  onReplied: () => Promise<void>
}) {
  const [resposta, setResposta] = useState('')
  const [busy, setBusy] = useState(false)

  async function enviarResposta() {
    if (!resposta.trim()) return
    setBusy(true)
    await supabase.from('reviews').update({ resposta }).eq('id', review.id)
    await onReplied()
    setBusy(false)
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-700">{review.profiles?.nome ?? 'Cliente'}</p>
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
          {review.nota_geral.toFixed(1)}
        </div>
      </div>
      {review.comentario && <p className="mt-2 text-sm text-slate-600">{review.comentario}</p>}
      {review.fotos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {review.fotos.map((url) => (
            <img key={url} src={url} className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200" />
          ))}
        </div>
      )}
      {review.resposta && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Resposta do profissional: </span>
          {review.resposta}
        </div>
      )}
      {isOwner && !review.resposta && (
        <div className="mt-3 flex gap-2">
          <input
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Responder..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <Button size="sm" disabled={busy || !resposta.trim()} onClick={() => void enviarResposta()}>
            Responder
          </Button>
        </div>
      )}
    </Card>
  )
}
