import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import type { Category, DocsStatus, Neighborhood } from '@/lib/types'

const STATUS_LABEL: Record<DocsStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise pela nossa equipe',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado — entre em contato com o suporte',
}

async function uploadFile(bucket: string, userId: string, file: File) {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  return path
}

export function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [existingStatus, setExistingStatus] = useState<DocsStatus | null | undefined>(undefined)

  const [bio, setBio] = useState('')
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([])
  const [selectedBairros, setSelectedBairros] = useState<string[]>([])
  const [chavePix, setChavePix] = useState('')
  const [referencia, setReferencia] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: neigh }] = await Promise.all([
        supabase
          .from('categories')
          .select('id, nome, slug, tipo, ativa, ordem')
          .eq('tipo', 'servico')
          .eq('ativa', true)
          .order('ordem'),
        supabase.from('neighborhoods').select('id, city_id, nome').order('nome'),
      ])
      setCategories((cats as Category[]) ?? [])
      setNeighborhoods((neigh as Neighborhood[]) ?? [])
    }
    void load()
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('professional_profiles')
      .select('docs_status')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setExistingStatus((data?.docs_status as DocsStatus) ?? null))
  }, [user])

  function toggle(list: string[], value: string, setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    if (selectedCategorias.length === 0) return setError('Selecione ao menos uma categoria.')
    if (selectedBairros.length === 0) return setError('Selecione ao menos um bairro.')
    if (!docFile || !selfieFile) return setError('Envie o documento e a selfie.')
    if (portfolioFiles.length < 3) return setError('Envie pelo menos 3 fotos de obras.')
    if (portfolioFiles.length > 10) return setError('No máximo 10 fotos de obras.')

    setSubmitting(true)
    setError(null)
    try {
      const docPath = await uploadFile('verification-docs', user.id, docFile)
      const selfiePath = await uploadFile('verification-docs', user.id, selfieFile)

      const portfolioUrls: string[] = []
      for (const file of portfolioFiles) {
        const path = await uploadFile('portfolio', user.id, file)
        portfolioUrls.push(supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl)
      }

      const { error: upsertError } = await supabase.from('professional_profiles').upsert({
        user_id: user.id,
        bio,
        categorias: selectedCategorias,
        bairros: selectedBairros,
        chave_pix: chavePix || null,
        docs_status: 'em_analise',
      })
      if (upsertError) throw upsertError

      const { error: docsError } = await supabase.from('verification_docs').insert({
        user_id: user.id,
        doc_url: docPath,
        selfie_url: selfiePath,
        referencia: referencia || null,
        status: 'em_analise',
      })
      if (docsError) throw docsError

      const { error: portfolioError } = await supabase.from('portfolio_items').insert(
        portfolioUrls.map((url) => ({ professional_id: user.id, foto_url: url, origem: 'upload' })),
      )
      if (portfolioError) throw portfolioError

      const papeis = profile?.papeis ?? []
      if (!papeis.includes('profissional')) {
        await supabase
          .from('profiles')
          .update({ papeis: [...papeis, 'profissional'] })
          .eq('id', user.id)
      }

      await refreshProfile()
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar cadastro.')
    } finally {
      setSubmitting(false)
    }
  }

  if (existingStatus === undefined) {
    return <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>
  }

  if (done || existingStatus) {
    const status = done ? 'em_analise' : (existingStatus as DocsStatus)
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-bold text-slate-800">Cadastro de profissional</h1>
          <p className="mt-3 text-slate-600">
            Status: <span className="font-semibold">{STATUS_LABEL[status]}</span>
          </p>
          {status === 'em_analise' && (
            <p className="mt-2 text-sm text-slate-400">
              Nossa equipe confere seus documentos e o portfólio em breve.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Cadastro de profissional</h1>
        <p className="mt-1 text-sm text-slate-500">
          Preencha seus dados e envie documento + fotos de obras para
          verificação (seção 5.2 do produto).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Sobre você / sua experiência
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Categorias</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <label
                key={c.id}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                  selectedCategorias.includes(c.id)
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedCategorias.includes(c.id)}
                  onChange={() => toggle(selectedCategorias, c.id, setSelectedCategorias)}
                />
                {c.nome}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Bairros atendidos</span>
          <div className="flex flex-wrap gap-2">
            {neighborhoods.map((n) => (
              <label
                key={n.id}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                  selectedBairros.includes(n.id)
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedBairros.includes(n.id)}
                  onChange={() => toggle(selectedBairros, n.id, setSelectedBairros)}
                />
                {n.nome}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Chave Pix (para repasses — seção 5.4)
          </label>
          <input
            value={chavePix}
            onChange={(e) => setChavePix(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Documento (RG/CNH/CNPJ)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Selfie</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Fotos de obras (3 a 10)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPortfolioFiles(Array.from(e.target.files ?? []))}
            className="w-full text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">{portfolioFiles.length} selecionada(s)</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Referência (nome e contato de um cliente anterior, opcional)
          </label>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Enviando...' : 'Enviar para verificação'}
        </button>
      </form>
    </div>
  )
}
