import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, Star } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/fields'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import type { AdCampaign, Category, Neighborhood, Profile, ProfessionalProfile } from '@/lib/types'

type Listing = Pick<
  ProfessionalProfile,
  'user_id' | 'bio' | 'nota_media' | 'verificado' | 'destaque_ate' | 'bairros' | 'score'
> & {
  profiles: Pick<Profile, 'nome' | 'foto_url'> | null
}

export function CategoryListPage() {
  const { slug } = useParams<{ slug: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [bairroId, setBairroId] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [banner, setBanner] = useState<AdCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function loadCategory() {
      const { data } = await supabase
        .from('categories')
        .select('id, nome, slug, tipo, ativa, ordem')
        .eq('slug', slug)
        .maybeSingle()
      if (!data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setCategory(data as Category)
      const { data: neigh } = await supabase
        .from('neighborhoods')
        .select('id, city_id, nome')
        .order('nome')
      setNeighborhoods((neigh as Neighborhood[]) ?? [])

      const today = new Date().toISOString().slice(0, 10)
      const { data: ads } = await supabase
        .from('ad_campaigns')
        .select('id, advertiser_id, criativo_url, categoria_id, link, inicio, fim, ativa')
        .eq('ativa', true)
        .eq('categoria_id', data.id)
        .lte('inicio', today)
        .gte('fim', today)
        .limit(1)
      const campaign = (ads as AdCampaign[])?.[0] ?? null
      setBanner(campaign)
      if (campaign) {
        void supabase.from('ad_events').insert({ campaign_id: campaign.id, tipo: 'impressao' })
      }
    }
    setNotFound(false)
    void loadCategory()
  }, [slug])

  useEffect(() => {
    if (!category) return
    async function loadListings() {
      setLoading(true)
      let q = supabase
        .from('professional_profiles')
        .select('user_id, bio, nota_media, verificado, destaque_ate, bairros, score, profiles(nome, foto_url)')
        .contains('categorias', [category!.id])
      if (bairroId) q = q.contains('bairros', [bairroId])
      const { data } = await q.order('score', { ascending: false })
      setListings((data as unknown as Listing[]) ?? [])
      setLoading(false)
    }
    void loadListings()
  }, [category, bairroId])

  async function handleBannerClick() {
    if (!banner) return
    await supabase.from('ad_events').insert({ campaign_id: banner.id, tipo: 'clique' })
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-slate-500">Categoria não encontrada.</p>
        <Link to="/" className="text-brand-600 underline">
          Voltar para a Home
        </Link>
      </div>
    )
  }

  const now = new Date()
  const destacados = listings.filter((p) => p.destaque_ate && new Date(p.destaque_ate) > now).slice(0, 2)
  const destacadosIds = new Set(destacados.map((p) => p.user_id))
  const ordenados = [...destacados, ...listings.filter((p) => !destacadosIds.has(p.user_id))]

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand-600"
        >
          <ChevronLeft className="h-4 w-4" /> Todas as categorias
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{category?.nome ?? '...'}</h1>
      </div>

      {banner && (
        <a
          href={banner.link ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void handleBannerClick()}
          className="block overflow-hidden rounded-2xl ring-1 ring-slate-200/70"
        >
          {banner.criativo_url ? (
            <img src={banner.criativo_url} alt="Anúncio" className="h-24 w-full object-cover" />
          ) : (
            <div className="flex h-20 items-center justify-center bg-slate-100 text-sm text-slate-400">
              Anúncio
            </div>
          )}
        </a>
      )}

      {neighborhoods.length > 0 && (
        <Select value={bairroId} onChange={(e) => setBairroId(e.target.value)} className="max-w-xs">
          <option value="">Todos os bairros</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nome}
            </option>
          ))}
        </Select>
      )}

      {loading ? (
        <PageLoader />
      ) : ordenados.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Ainda não temos profissionais aqui"
          description="Ninguém se cadastrou nessa categoria/bairro ainda."
        />
      ) : (
        <div className="space-y-3">
          {ordenados.map((p) => {
            const patrocinado = destacadosIds.has(p.user_id)
            return (
              <Link key={p.user_id} to={`/profissionais/${p.user_id}`}>
                <Card interactive className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{p.profiles?.nome ?? 'Profissional'}</p>
                      {p.verificado && (
                        <Badge tone="success">
                          <ShieldCheck className="h-3 w-3" /> Verificado
                        </Badge>
                      )}
                    </div>
                    {p.nota_media > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
                        {p.nota_media.toFixed(1)}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">{p.bio}</p>
                  </div>
                  {patrocinado && <Badge tone="brand">Patrocinado</Badge>}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
