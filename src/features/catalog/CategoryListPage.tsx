import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import type { Category, Neighborhood, Profile, ProfessionalProfile } from '@/lib/types'

type Listing = Pick<
  ProfessionalProfile,
  'user_id' | 'bio' | 'nota_media' | 'verificado' | 'destaque_ate' | 'bairros'
> & {
  profiles: Pick<Profile, 'nome' | 'foto_url'> | null
}

export function CategoryListPage() {
  const { slug } = useParams<{ slug: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [bairroId, setBairroId] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
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
        .select('user_id, bio, nota_media, verificado, destaque_ate, bairros, profiles(nome, foto_url)')
        .contains('categorias', [category!.id])
      if (bairroId) q = q.contains('bairros', [bairroId])
      const { data } = await q
        .order('verificado', { ascending: false })
        .order('nota_media', { ascending: false })
      setListings((data as unknown as Listing[]) ?? [])
      setLoading(false)
    }
    void loadListings()
  }, [category, bairroId])

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link to="/" className="text-sm text-slate-400 hover:text-brand-600">
          ← Todas as categorias
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">{category?.nome ?? '...'}</h1>
      </div>

      {neighborhoods.length > 0 && (
        <select
          value={bairroId}
          onChange={(e) => setBairroId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os bairros</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nome}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : listings.length === 0 ? (
        <p className="text-sm text-slate-400">
          Ainda não temos profissionais verificados nessa categoria/bairro.
        </p>
      ) : (
        <ul className="space-y-3">
          {listings.map((p) => {
            const patrocinado = p.destaque_ate ? new Date(p.destaque_ate) > new Date() : false
            return (
              <li key={p.user_id}>
                <Link
                  to={`/profissionais/${p.user_id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-500"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {p.profiles?.nome ?? 'Profissional'}
                      {p.verificado && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Verificado
                        </span>
                      )}
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">{p.bio}</p>
                  </div>
                  {patrocinado && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Patrocinado
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
