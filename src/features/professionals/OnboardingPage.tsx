import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { HardHat, UploadCloud } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { publicUrl, uploadFile } from '@/lib/storage'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/fields'
import { PageLoader } from '@/components/ui/Spinner'
import type { Category, DocsStatus, Neighborhood } from '@/lib/types'

const STATUS_LABEL: Record<DocsStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise pela nossa equipe',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado — entre em contato com o suporte',
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        selected
          ? 'border-brand-600 bg-brand-50 text-brand-700'
          : 'border-slate-300 text-slate-600 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  )
}

function FileField({
  label,
  onChange,
  multiple,
  hint,
}: {
  label: string
  onChange: (files: File[]) => void
  multiple?: boolean
  hint?: string
}) {
  const [count, setCount] = useState(0)
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 transition hover:border-brand-400 hover:text-brand-600">
        <UploadCloud className="h-4 w-4" />
        {count > 0 ? `${count} arquivo(s) selecionado(s)` : 'Escolher arquivo(s)'}
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            setCount(files.length)
            onChange(files)
          }}
        />
      </label>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
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
        portfolioUrls.push(publicUrl('portfolio', path))
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

  if (existingStatus === undefined) return <PageLoader />

  if (done || existingStatus) {
    const status = done ? 'em_analise' : (existingStatus as DocsStatus)
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Card className="space-y-2 text-center">
          <HardHat className="mx-auto h-8 w-8 text-brand-500" />
          <h1 className="text-xl font-bold text-slate-900">Cadastro de profissional</h1>
          <p className="text-slate-600">
            Status: <span className="font-semibold">{STATUS_LABEL[status]}</span>
          </p>
          {status === 'em_analise' && (
            <p className="text-sm text-slate-400">
              Nossa equipe confere seus documentos e o portfólio em breve.
            </p>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cadastro de profissional</h1>
        <p className="mt-1 text-sm text-slate-500">
          Preencha seus dados e envie documento + fotos de obras para verificação.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Textarea
            label="Sobre você / sua experiência"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />

          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Categorias</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  selected={selectedCategorias.includes(c.id)}
                  onClick={() => toggle(selectedCategorias, c.id, setSelectedCategorias)}
                >
                  {c.nome}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Bairros atendidos</span>
            <div className="flex flex-wrap gap-2">
              {neighborhoods.map((n) => (
                <Chip
                  key={n.id}
                  selected={selectedBairros.includes(n.id)}
                  onClick={() => toggle(selectedBairros, n.id, setSelectedBairros)}
                >
                  {n.nome}
                </Chip>
              ))}
            </div>
          </div>

          <Input
            label="Chave Pix (para repasses)"
            value={chavePix}
            onChange={(e) => setChavePix(e.target.value)}
          />

          <FileField label="Documento (RG/CNH/CNPJ)" onChange={(f) => setDocFile(f[0] ?? null)} />
          <FileField label="Selfie" onChange={(f) => setSelfieFile(f[0] ?? null)} />
          <FileField
            label="Fotos de obras (3 a 10)"
            multiple
            onChange={setPortfolioFiles}
            hint={`${portfolioFiles.length} selecionada(s)`}
          />

          <Input
            label="Referência (nome e contato de um cliente anterior, opcional)"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar para verificação'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
