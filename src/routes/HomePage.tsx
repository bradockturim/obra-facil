import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShieldCheck, Star } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { AdCampaign, Category, Profile, ProfessionalProfile } from '@/lib/types'

type Highlight = Pick<ProfessionalProfile, 'user_id' | 'bio' | 'nota_media' | 'verificado' | 'score'> & {
  profiles: Pick<Profile, 'nome' | 'foto_url'> | null
}

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [banner, setBanner] = useState<AdCampaign | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const [{ data: cats }, { data: pros }, { data: ads }] = await Promise.all([
        supabase
          .from('categories')
          .select('id, nome, slug, tipo, ativa, ordem')
          .eq('tipo', 'servico')
          .eq('ativa', true)
          .order('ordem'),
        supabase
          .from('professional_profiles')
          .select('user_id, bio, nota_media, verificado, score, profiles(nome, foto_url)')
          .eq('verificado', true)
          .order('score', { ascending: false })
          .limit(6),
        supabase
          .from('ad_campaigns')
          .select('id, advertiser_id, criativo_url, categoria_id, link, inicio, fim, ativa')
          .eq('ativa', true)
          .is('categoria_id', null)
          .lte('inicio', today)
          .gte('fim', today)
          .limit(1),
      ])
      setCategories((cats as Category[]) ?? [])
      setHighlights((pros as unknown as Highlight[]) ?? [])
      const campaign = ((ads as AdCampaign[]) ?? [])[0] ?? null
      setBanner(campaign)
      if (campaign) {
        void supabase.from('ad_events').insert({ campaign_id: campaign.id, tipo: 'impressao' })
      }
      setLoading(false)
    }
    void load()
  }, [])

  async function handleBannerClick() {
    if (!banner) return
    await supabase.from('ad_events').insert({ campaign_id: banner.id, tipo: 'clique' })
  }

  const filteredCategories = categories.filter((c) =>
    c.nome.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-12 text-white shadow-lg shadow-brand-600/20 sm:px-10">
        <h1 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
          Profissionais de construção e reforma verificados em Três Rios
        </h1>
        <p className="mt-3 max-w-lg text-brand-50">
          Encontre, converse, contrate e pague com o Pagamento Garantido —
          o valor só é liberado depois que você aprova o serviço.
        </p>
        <div className="relative mt-6 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar categoria (ex.: pintor, eletricista...)"
            className="w-full rounded-xl border-0 py-3 pl-10 pr-4 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>
      </section>

      {banner && (
        <a
          href={banner.link ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void handleBannerClick()}
          className="block overflow-hidden rounded-2xl ring-1 ring-slate-200/70"
        >
          {banner.criativo_url ? (
            <img src={banner.criativo_url} alt="Anúncio" className="h-28 w-full object-cover sm:h-36" />
          ) : (
            <div className="flex h-24 items-center justify-center bg-slate-100 text-sm text-slate-400">
              Anúncio
            </div>
          )}
        </a>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Categorias</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : filteredCategories.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma categoria encontrada.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filteredCategories.map((cat) => (
              <Link key={cat.id} to={`/categorias/${cat.slug}`}>
                <Card
                  interactive
                  className="p-4 text-center font-medium text-slate-700 hover:text-brand-700"
                >
                  {cat.nome}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Profissionais em destaque</h2>
        {highlights.length === 0 ? (
          <p className="text-sm text-slate-400">
            Ainda não temos profissionais verificados por aqui.{' '}
            <Link to="/profissional/cadastro" className="text-brand-600 underline">
              Seja o primeiro a se cadastrar
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {highlights.map((p) => (
              <Link key={p.user_id} to={`/profissionais/${p.user_id}`}>
                <Card interactive>
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-slate-800">{p.profiles?.nome ?? 'Profissional'}</p>
                    <Badge tone="success">
                      <ShieldCheck className="h-3 w-3" /> Verificado
                    </Badge>
                  </div>
                  {p.nota_media > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
                      {p.nota_media.toFixed(1)}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.bio}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
