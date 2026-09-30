import { useEffect, useState, type FormEvent } from 'react'
import { Megaphone, Plus, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { uploadFile, publicUrl } from '@/lib/storage'
import { useAuth } from '@/features/auth/AuthContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/fields'
import { EmptyState } from '@/components/ui/EmptyState'
import type { AdCampaign, Advertiser, Category, ProfessionalProfile, Profile } from '@/lib/types'

const TABS = ['Anunciantes', 'Campanhas', 'Destaques'] as const

export function AdsAdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Anunciantes')

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium transition ${
              tab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Anunciantes' && <AdvertisersTab />}
      {tab === 'Campanhas' && <CampaignsTab />}
      {tab === 'Destaques' && <FeaturedTab />}
    </div>
  )
}

function AdvertisersTab() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([])
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [contato, setContato] = useState('')

  async function load() {
    const { data } = await supabase.from('advertisers').select('id, nome, cnpj, contato').order('nome')
    setAdvertisers((data as Advertiser[]) ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    await supabase.from('advertisers').insert({ nome, cnpj: cnpj || null, contato: contato || null })
    setNome('')
    setCnpj('')
    setContato('')
    void load()
  }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <Input label="Nome do anunciante" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input label="CNPJ (opcional)" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          <Input label="Contato (opcional)" value={contato} onChange={(e) => setContato(e.target.value)} />
          <Button type="submit">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </form>
      </Card>

      {advertisers.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nenhum anunciante cadastrado" />
      ) : (
        <div className="space-y-2">
          {advertisers.map((a) => (
            <Card key={a.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-800">{a.nome}</p>
                <p className="text-xs text-slate-400">{a.cnpj ?? 'sem CNPJ'}</p>
              </div>
              <p className="text-sm text-slate-500">{a.contato}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CampaignsTab() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [advertiserId, setAdvertiserId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [link, setLink] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [valor, setValor] = useState('')
  const [criativo, setCriativo] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const [{ data: c }, { data: a }, { data: cat }] = await Promise.all([
      supabase
        .from('ad_campaigns')
        .select('id, advertiser_id, criativo_url, categoria_id, link, inicio, fim, ativa')
        .order('inicio', { ascending: false }),
      supabase.from('advertisers').select('id, nome, cnpj, contato').order('nome'),
      supabase.from('categories').select('id, nome, slug, tipo, ativa, ordem').order('nome'),
    ])
    setCampaigns((c as AdCampaign[]) ?? [])
    setAdvertisers((a as Advertiser[]) ?? [])
    setCategories((cat as Category[]) ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!user || !advertiserId || !inicio || !fim) return
    setBusy(true)
    setError(null)
    try {
      let criativoUrl: string | null = null
      if (criativo) {
        const path = await uploadFile('midia-campanhas', user.id, criativo)
        criativoUrl = publicUrl('midia-campanhas', path)
      }
      const { data: campaign, error: insertError } = await supabase
        .from('ad_campaigns')
        .insert({
          advertiser_id: advertiserId,
          categoria_id: categoriaId || null,
          criativo_url: criativoUrl,
          link: link || null,
          inicio,
          fim,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      if (valor) {
        await supabase.from('manual_payments').insert({
          referente_tipo: 'anuncio',
          referente_id: campaign.id,
          valor: parseFloat(valor),
          metodo: 'pix',
          confirmado_por: user.id,
        })
      }

      setAdvertiserId('')
      setCategoriaId('')
      setLink('')
      setInicio('')
      setFim('')
      setValor('')
      setCriativo(null)
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar campanha.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Anunciante"
            value={advertiserId}
            onChange={(e) => setAdvertiserId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {advertisers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
          <Select
            label="Categoria (opcional — vazio = todas)"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
          <Input label="Link de destino" value={link} onChange={(e) => setLink(e.target.value)} />
          <Input
            label="Valor recebido (Pix, opcional)"
            type="number"
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <Input label="Início" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <Input label="Fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Criativo (imagem)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCriativo(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          {error && <p className="text-sm text-danger-600 sm:col-span-2">{error}</p>}
          <Button type="submit" disabled={busy} className="sm:col-span-2 sm:w-fit">
            <Plus className="h-4 w-4" /> Criar campanha
          </Button>
        </form>
      </Card>

      {campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nenhuma campanha cadastrada" />
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => {
            const active = c.ativa && c.inicio <= today() && today() <= c.fim
            return (
              <Card key={c.id} className="flex items-center gap-4">
                {c.criativo_url && (
                  <img src={c.criativo_url} className="h-14 w-24 shrink-0 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-slate-700">
                    {advertisers.find((a) => a.id === c.advertiser_id)?.nome ?? 'Anunciante'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {c.inicio} → {c.fim} ·{' '}
                    {categories.find((cat) => cat.id === c.categoria_id)?.nome ?? 'Todas as categorias'}
                  </p>
                </div>
                <Badge tone={active ? 'success' : 'neutral'}>{active ? 'No ar' : 'Fora do período'}</Badge>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

interface ProDestaqueRow extends Pick<ProfessionalProfile, 'user_id' | 'destaque_ate'> {
  profiles: Pick<Profile, 'nome'> | null
}

function FeaturedTab() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ProDestaqueRow[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('professional_profiles')
      .select('user_id, destaque_ate, profiles(nome)')
      .eq('verificado', true)
      .order('destaque_ate', { ascending: false, nullsFirst: false })
    setRows((data as unknown as ProDestaqueRow[]) ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function ativar(row: ProDestaqueRow) {
    if (!user) return
    setBusyId(row.user_id)
    const destaqueAte = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('professional_profiles')
      .update({ destaque_ate: destaqueAte })
      .eq('user_id', row.user_id)
    const valor = valores[row.user_id]
    if (valor) {
      await supabase.from('manual_payments').insert({
        referente_tipo: 'destaque',
        referente_id: row.user_id,
        valor: parseFloat(valor),
        metodo: 'pix',
        confirmado_por: user.id,
      })
    }
    await load()
    setBusyId(null)
  }

  if (rows.length === 0) {
    return <EmptyState icon={Sparkles} title="Nenhum profissional verificado ainda" />
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const active = r.destaque_ate && new Date(r.destaque_ate) > new Date()
        return (
          <Card key={r.user_id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-800">{r.profiles?.nome ?? 'Profissional'}</p>
              {active && r.destaque_ate && (
                <p className="text-xs text-slate-400">
                  Destaque ativo até {new Date(r.destaque_ate).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {active && <Badge tone="brand">Patrocinado</Badge>}
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="R$ recebido"
                value={valores[r.user_id] ?? ''}
                onChange={(e) => setValores((prev) => ({ ...prev, [r.user_id]: e.target.value }))}
                className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <Button size="sm" disabled={busyId === r.user_id} onClick={() => void ativar(r)}>
                Ativar destaque (30 dias)
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
