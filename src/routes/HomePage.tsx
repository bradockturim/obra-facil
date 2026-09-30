import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import type { Category, Profile, ProfessionalProfile } from '@/lib/types'

type Highlight = Pick<ProfessionalProfile, 'user_id' | 'bio' | 'nota_media' | 'verificado'> & {
  profiles: Pick<Profile, 'nome' | 'foto_url'> | null
}

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: pros }] = await Promise.all([
        supabase
          .from('categories')
          .select('id, nome, slug, tipo, ativa, ordem')
          .eq('tipo', 'servico')
          .eq('ativa', true)
          .order('ordem'),
        supabase
          .from('professional_profiles')
          .select('user_id, bio, nota_media, verificado, profiles(nome, foto_url)')
          .eq('verificado', true)
          .order('nota_media', { ascending: false })
          .limit(6),
      ])
      setCategories((cats as Category[]) ?? [])
      setHighlights((pros as unknown as Highlight[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [])

  const filteredCategories = categories.filter((c) =>
    c.nome.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <section className="rounded-2xl bg-brand-600 px-6 py-10 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Profissionais de construção e reforma verificados em Três Rios
        </h1>
        <p className="mt-2 max-w-xl text-brand-50">
          Encontre, converse, contrate e pague com segurança. O Pagamento
          Garantido chega nas próximas etapas — hoje o combinado é direto
          com o profissional.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar categoria (ex.: pintor, eletricista...)"
          className="mt-6 w-full max-w-md rounded-lg border-0 px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-white"
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Categorias</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : filteredCategories.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma categoria encontrada.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filteredCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categorias/${cat.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-center font-medium text-slate-700 shadow-sm transition hover:border-brand-500 hover:text-brand-700"
              >
                {cat.nome}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Profissionais em destaque
        </h2>
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
              <Link
                key={p.user_id}
                to={`/profissionais/${p.user_id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-500"
              >
                <p className="font-semibold text-slate-800">
                  {p.profiles?.nome ?? 'Profissional'}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.bio}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
