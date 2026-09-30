import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { publicUrl, uploadFile } from '@/lib/storage'
import type { Category, Neighborhood } from '@/lib/types'

export function RequestFormPage() {
  const { id: professionalId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [categoriaId, setCategoriaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [bairroId, setBairroId] = useState('')
  const [prazo, setPrazo] = useState('')
  const [fotos, setFotos] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: pro } = await supabase
        .from('professional_profiles')
        .select('categorias')
        .eq('user_id', professionalId)
        .maybeSingle()
      const categoriaIds = (pro?.categorias as string[]) ?? []
      const [{ data: cats }, { data: neigh }] = await Promise.all([
        categoriaIds.length
          ? supabase.from('categories').select('id, nome, slug, tipo, ativa, ordem').in('id', categoriaIds)
          : Promise.resolve({ data: [] }),
        supabase.from('neighborhoods').select('id, city_id, nome').order('nome'),
      ])
      setCategories((cats as Category[]) ?? [])
      setNeighborhoods((neigh as Neighborhood[]) ?? [])
    }
    void load()
  }, [professionalId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !professionalId) return
    if (!categoriaId) return setError('Selecione a categoria do serviço.')
    if (!descricao.trim()) return setError('Descreva o serviço que você precisa.')

    setSubmitting(true)
    setError(null)
    try {
      const fotoUrls: string[] = []
      for (const file of fotos) {
        const path = await uploadFile('pedidos', user.id, file)
        fotoUrls.push(publicUrl('pedidos', path))
      }

      const { data: request, error: requestError } = await supabase
        .from('service_requests')
        .insert({
          cliente_id: user.id,
          categoria_id: categoriaId,
          descricao,
          fotos: fotoUrls,
          bairro_id: bairroId || null,
          prazo: prazo || null,
        })
        .select('id')
        .single()
      if (requestError) throw requestError

      const { error: targetError } = await supabase
        .from('request_targets')
        .insert({ request_id: request.id, professional_id: professionalId })
      if (targetError) throw targetError

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ request_id: request.id, cliente_id: user.id, professional_id: professionalId })
        .select('id')
        .single()
      if (convError) throw convError

      navigate(`/conversas/${conversation.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar pedido.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Pedir orçamento</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Descreva o serviço
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Bairro</label>
          <select
            value={bairroId}
            onChange={(e) => setBairroId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {neighborhoods.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Prazo desejado (opcional)
          </label>
          <input
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            placeholder="Ex.: até 2 semanas"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Fotos (opcional)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
            className="w-full text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Enviando...' : 'Enviar pedido'}
        </button>
      </form>
    </div>
  )
}
