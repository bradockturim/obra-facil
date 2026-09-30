import { useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/fields'
import { PageLoader } from '@/components/ui/Spinner'
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
      <Card>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <Input
            label="Nova categoria"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Jardinagem"
          />
          <Select
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'servico' | 'lead')}
          >
            <option value="servico">Serviço (Pagamento Garantido)</option>
            <option value="lead">Lead (parceiro)</option>
          </Select>
          <Button type="submit">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
      </Card>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Ativa</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 text-slate-800">{c.nome}</td>
                  <td className="px-4 py-2.5 text-slate-500">{c.tipo}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={c.ativa ? 'success' : 'neutral'}>{c.ativa ? 'Sim' : 'Não'}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleAtiva(c)}
                      className="text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      {c.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
