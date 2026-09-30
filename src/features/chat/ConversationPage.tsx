import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, FileSignature, Plus, Send, X, XCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import type { Conversation, Message, Proposal, ProposalStage } from '@/lib/types'

interface StageDraft {
  descricao: string
  valor: string
}

const MATERIAL_LABEL: Record<string, string> = {
  cliente: 'Material por conta do cliente',
  profissional: 'Material por conta do profissional',
  combinado: 'Material combinado à parte',
}

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [notAllowed, setNotAllowed] = useState(false)

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [stages, setStages] = useState<ProposalStage[]>([])
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [stageDrafts, setStageDrafts] = useState<StageDraft[]>([{ descricao: '', valor: '' }])
  const [prazoDias, setPrazoDias] = useState('')
  const [materialPor, setMaterialPor] = useState<'cliente' | 'profissional' | 'combinado'>('combinado')
  const [observacoes, setObservacoes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  async function loadProposal(conversationId: string) {
    const { data: p } = await supabase
      .from('proposals')
      .select('id, conversation_id, valor_total, prazo_dias, material_por, observacoes, status, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setProposal((p as Proposal) ?? null)
    if (p) {
      const { data: s } = await supabase
        .from('proposal_stages')
        .select('id, proposal_id, ordem, descricao, valor')
        .eq('proposal_id', p.id)
        .order('ordem')
      setStages((s as ProposalStage[]) ?? [])
    } else {
      setStages([])
    }
  }

  useEffect(() => {
    if (!id || !user) return
    async function load() {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, request_id, cliente_id, professional_id, created_at')
        .eq('id', id)
        .maybeSingle()

      if (!conv || (conv.cliente_id !== user!.id && conv.professional_id !== user!.id)) {
        setNotAllowed(true)
        setLoading(false)
        return
      }
      setConversation(conv as Conversation)

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, conversation_id, autor_id, tipo, conteudo, criado_em')
        .eq('conversation_id', id)
        .order('criado_em', { ascending: true })
      setMessages((msgs as Message[]) ?? [])

      await loadProposal(id!)
      setLoading(false)
    }
    void load()
  }, [id, user])

  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals', filter: `conversation_id=eq.${id}` },
        () => void loadProposal(id),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || !user || !conversation) return
    const content = text
    setText('')
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      autor_id: user.id,
      tipo: 'texto',
      conteudo: content,
    })
  }

  function updateStageDraft(index: number, field: keyof StageDraft, value: string) {
    setStageDrafts((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function addStageDraft() {
    if (stageDrafts.length >= 6) return
    setStageDrafts((prev) => [...prev, { descricao: '', valor: '' }])
  }

  function removeStageDraft(index: number) {
    setStageDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  const valorTotal = stageDrafts.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0)

  async function submitProposal(e: FormEvent) {
    e.preventDefault()
    if (!conversation) return
    const validStages = stageDrafts.filter((s) => s.descricao.trim() && parseFloat(s.valor) > 0)
    if (validStages.length === 0) return setError('Adicione ao menos uma etapa com valor.')
    if (!prazoDias || Number(prazoDias) <= 0) return setError('Informe o prazo em dias.')

    setBusy(true)
    setError(null)
    try {
      const { data: newProposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          conversation_id: conversation.id,
          valor_total: valorTotal,
          prazo_dias: Number(prazoDias),
          material_por: materialPor,
          observacoes: observacoes || null,
        })
        .select('id')
        .single()
      if (proposalError) throw proposalError

      const { error: stagesError } = await supabase.from('proposal_stages').insert(
        validStages.map((s, i) => ({
          proposal_id: newProposal.id,
          ordem: i + 1,
          descricao: s.descricao,
          valor: parseFloat(s.valor),
        })),
      )
      if (stagesError) throw stagesError

      setShowProposalForm(false)
      setStageDrafts([{ descricao: '', valor: '' }])
      setPrazoDias('')
      setObservacoes('')
      await loadProposal(conversation.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar proposta.')
    } finally {
      setBusy(false)
    }
  }

  async function recusarProposta() {
    if (!proposal) return
    setBusy(true)
    await supabase.from('proposals').update({ status: 'recusada' }).eq('id', proposal.id)
    await loadProposal(conversation!.id)
    setBusy(false)
  }

  async function aceitarProposta() {
    if (!proposal || !conversation) return
    setBusy(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('proposals')
        .update({ status: 'aceita' })
        .eq('id', proposal.id)
      if (updateError) throw updateError

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          proposal_id: proposal.id,
          cliente_id: conversation.cliente_id,
          professional_id: conversation.professional_id,
          comprovante_hash: crypto.randomUUID(),
        })
        .select('id')
        .single()
      if (jobError) throw jobError

      const { error: jobStagesError } = await supabase.from('job_stages').insert(
        stages.map((s) => ({
          job_id: job.id,
          ordem: s.ordem,
          descricao: s.descricao,
          valor: s.valor,
        })),
      )
      if (jobStagesError) throw jobStagesError

      navigate(`/obras/${job.id}/comprovante`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar proposta.')
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />

  if (notAllowed || !conversation) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-slate-500">Conversa não encontrada ou sem acesso.</p>
        <Link to="/" className="text-brand-600 underline">
          Voltar para a Home
        </Link>
      </div>
    )
  }

  const isProfessional = conversation.professional_id === user!.id
  const isClient = conversation.cliente_id === user!.id

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      {proposal && (
        <Card className="border-brand-200 bg-brand-50/60">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-brand-700">Proposta — R$ {proposal.valor_total.toFixed(2)}</p>
            <Badge tone="brand">{proposal.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-brand-700">
            Prazo: {proposal.prazo_dias} dia(s)
            {proposal.material_por && ` · ${MATERIAL_LABEL[proposal.material_por]}`}
          </p>
          {proposal.observacoes && <p className="mt-1 text-sm text-brand-700">{proposal.observacoes}</p>}
          <ul className="mt-2 space-y-1 text-sm text-brand-800">
            {stages.map((s) => (
              <li key={s.id}>
                {s.ordem}. {s.descricao} — R$ {s.valor.toFixed(2)}
              </li>
            ))}
          </ul>
          {isClient && proposal.status === 'enviada' && (
            <div className="mt-3 flex gap-2">
              <Button variant="success" size="sm" disabled={busy} onClick={() => void aceitarProposta()}>
                <Check className="h-4 w-4" /> Aceitar
              </Button>
              <Button variant="danger" size="sm" disabled={busy} onClick={() => void recusarProposta()}>
                <XCircle className="h-4 w-4" /> Recusar
              </Button>
            </div>
          )}
        </Card>
      )}

      {error && <p className="text-sm text-danger-600">{error}</p>}

      {isProfessional && (!proposal || proposal.status !== 'enviada') && (
        <div>
          {!showProposalForm ? (
            <Button onClick={() => setShowProposalForm(true)}>
              <FileSignature className="h-4 w-4" /> Enviar proposta
            </Button>
          ) : (
            <form onSubmit={submitProposal}>
            <Card className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">Etapas (até 6)</p>
              {stageDrafts.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={s.descricao}
                    onChange={(e) => updateStageDraft(i, 'descricao', e.target.value)}
                    placeholder={`Etapa ${i + 1}`}
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <input
                    value={s.valor}
                    onChange={(e) => updateStageDraft(i, 'valor', e.target.value)}
                    placeholder="Valor"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  {stageDrafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStageDraft(i)}
                      className="text-slate-400 hover:text-danger-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {stageDrafts.length < 6 && (
                <button
                  type="button"
                  onClick={addStageDraft}
                  className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" /> adicionar etapa
                </button>
              )}
              <p className="text-sm text-slate-500">Total: R$ {valorTotal.toFixed(2)}</p>

              <div className="flex gap-2">
                <input
                  value={prazoDias}
                  onChange={(e) => setPrazoDias(e.target.value)}
                  type="number"
                  min="1"
                  placeholder="Prazo (dias)"
                  className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <select
                  value={materialPor}
                  onChange={(e) => setMaterialPor(e.target.value as typeof materialPor)}
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="combinado">Material combinado à parte</option>
                  <option value="cliente">Material por conta do cliente</option>
                  <option value="profissional">Material por conta do profissional</option>
                </select>
              </div>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações (opcional)"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Enviando...' : 'Enviar proposta'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowProposalForm(false)}>
                  Cancelar
                </Button>
              </div>
            </Card>
            </form>
          )}
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma mensagem ainda. Diga oi!</p>
        ) : (
          messages.map((m) => {
            const mine = m.autor_id === user!.id
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    mine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {m.conteudo}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <Button type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
