import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Category } from '@/lib/types'

const DIACRITICS = /[̀-ͯ]/g

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'servico' | 'lead'>('servico')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('id, nome, slug, tipo, ativa, ordem')
      .order('tipo')
      .order('ordem')
    setCategories((data as Category[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nome.trim()) return
    const { error: insertError } = await supabase.from('categories').insert({
      nome: nome.trim(),
      slug: slugify(nome),
      tipo,
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setNome('')
    void load()
  }

  async function toggleAtiva(cat: Category) {
    await supabase.from('categories').update({ ativa: !cat.ativa }).eq('id', cat.id)
    void load()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nova categoria</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Jardinagem"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'servico' | 'lead')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="servico">Serviço (Pagamento Garantido)</option>
            <option value="lead">Lead (parceiro)</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Adicionar
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <table className="w-full overflow-hidden rounded-xl bg-white text-sm shadow-sm">
          <thead className="bg-slate-100 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Ativa</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">{c.nome}</td>
                <td className="px-4 py-2 text-slate-500">{c.tipo}</td>
                <td className="px-4 py-2">{c.ativa ? 'Sim' : 'Não'}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => toggleAtiva(c)}
                    className="text-brand-600 underline"
                  >
                    {c.ativa ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
