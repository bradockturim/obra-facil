import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import type { Category, Neighborhood, PortfolioItem, Profile, ProfessionalProfile } from '@/lib/types'

interface FullProfile extends ProfessionalProfile {
  profiles: Profile | null
}

export function ProfessionalPublicPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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
      setLoading(false)
    }
    void load()
  }, [id])

  if (loading) {
    return <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>
  }

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {profile.profiles?.nome ?? 'Profissional'}
            </h1>
            {profile.verificado && (
              <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Verificado
              </span>
            )}
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>★ {profile.nota_media.toFixed(1)}</p>
            <p>{profile.total_avaliacoes} avaliações</p>
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-slate-600">{profile.bio}</p>}

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.id}
                className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
              >
                {c.nome}
              </span>
            ))}
          </div>
        )}

        {neighborhoods.length > 0 && (
          <p className="mt-2 text-sm text-slate-400">
            Atende: {neighborhoods.map((n) => n.nome).join(', ')}
          </p>
        )}

        <Link
          to={user ? `/profissionais/${id}/pedido` : '/login'}
          className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Pedir orçamento
        </Link>
      </div>

      {portfolio.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Portfólio</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {portfolio.map((item) => (
              <img
                key={item.id}
                src={item.foto_url}
                alt={item.descricao ?? 'Foto do portfólio'}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
