import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { uploadFile, publicUrl } from '@/lib/storage'
import { DemoBanner } from '@/components/DemoBanner'
import type { Dispute, Job, JobStage } from '@/lib/types'

const STAGE_STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  paga_retida: 'Paga — retida',
  concluida_aguardando: 'Concluída — aguardando aprovação',
  aprovada: 'Aprovada',
  liberada: 'Liberada',
  contestada: 'Contestada',
  reembolsada: 'Reembolsada',
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [stages, setStages] = useState<JobStage[]>([])
  const [disputesByStage, setDisputesByStage] = useState<Record<string, Dispute>>({})
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const [{ data: j }, { data: s }] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, proposal_id, cliente_id, professional_id, status, comprovante_hash, iniciado_em, concluido_em')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('job_stages')
        .select('id, job_id, ordem, descricao, valor, status, fotos_conclusao, prazo_aprovacao')
        .eq('job_id', id)
        .order('ordem'),
    ])
    setJob((j as Job) ?? null)
    const stageList = (s as JobStage[]) ?? []
    setStages(stageList)

    const stageIds = stageList.map((x) => x.id)
    if (stageIds.length) {
      const { data: disputes } = await supabase
        .from('disputes')
        .select('id, stage_id, aberta_por, motivo, fotos, decisao, valor_cliente, valor_profissional, resolvida_em, created_at')
        .in('stage_id', stageIds)
        .order('created_at', { ascending: false })
      const map: Record<string, Dispute> = {}
      for (const d of (disputes as Dispute[]) ?? []) {
        if (!map[d.stage_id]) map[d.stage_id] = d
      }
      setDisputesByStage(map)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadAll()
  }, [id])

  if (loading) return <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>

  if (!job || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-slate-500">Obra não encontrada ou sem acesso.</p>
        <Link to="/obras" className="text-brand-600 underline">
          Voltar
        </Link>
      </div>
    )
  }

  const isClient = job.cliente_id === user.id
  const isProfessional = job.professional_id === user.id

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link to="/obras" className="text-sm text-slate-400 hover:text-brand-600">
          ← Minhas obras
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">Acompanhamento da obra</h1>
        <Link to={`/obras/${job.id}/comprovante`} className="text-sm text-brand-600 underline">
          Ver comprovante do acordo
        </Link>
      </div>

      <DemoBanner />

      <ul className="space-y-3">
        {stages.map((s) => (
          <StageCard
            key={s.id}
            stage={s}
            jobId={job.id}
            isClient={isClient}
            isProfessional={isProfessional}
            dispute={disputesByStage[s.id]}
            onChanged={loadAll}
          />
        ))}
      </ul>
    </div>
  )
}

interface StageCardProps {
  stage: JobStage
  jobId: string
  isClient: boolean
  isProfessional: boolean
  dispute?: Dispute
  onChanged: () => Promise<void>
}

function StageCard({ stage, jobId, isClient, isProfessional, dispute, onChanged }: StageCardProps) {
  const { user } = useAuth()
  const [fotos, setFotos] = useState<File[]>([])
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [disputeFotos, setDisputeFotos] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleComplete() {
    if (!user || fotos.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const urls: string[] = []
      for (const file of fotos) {
        const path = await uploadFile('obras', user.id, file)
        urls.push(publicUrl('obras', path))
      }
      const { error: rpcError } = await supabase.rpc('stage_complete', {
        p_stage_id: stage.id,
        p_fotos: urls,
      })
      if (rpcError) throw rpcError
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar conclusão.')
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    setBusy(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('stage_approve', { p_stage_id: stage.id })
    if (rpcError) setError(rpcError.message)
    await onChanged()
    setBusy(false)
  }

  async function handleCancel() {
    if (!window.confirm('Cancelar esta etapa e reembolsar o valor retido?')) return
    setBusy(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('stage_cancel', { p_stage_id: stage.id })
    if (rpcError) setError(rpcError.message)
    await onChanged()
    setBusy(false)
  }

  async function handleDispute() {
    if (!user || !motivo.trim()) return
    setBusy(true)
    setError(null)
    try {
      const urls: string[] = []
      for (const file of disputeFotos) {
        const path = await uploadFile('obras', user.id, file)
        urls.push(publicUrl('obras', path))
      }
      const { error: rpcError } = await supabase.rpc('stage_dispute', {
        p_stage_id: stage.id,
        p_motivo: motivo,
        p_fotos: urls,
      })
      if (rpcError) throw rpcError
      setDisputeOpen(false)
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir contestação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-800">
          {stage.ordem}. {stage.descricao}
        </p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {STAGE_STATUS_LABEL[stage.status] ?? stage.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">R$ {stage.valor.toFixed(2)}</p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {stage.status === 'aguardando_pagamento' && isClient && (
        <Link
          to={`/obras/${jobId}/etapas/${stage.id}/pagar`}
          className="mt-3 inline-block rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Pagar esta etapa
        </Link>
      )}

      {stage.status === 'paga_retida' && isProfessional && (
        <div className="mt-3 space-y-2">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
          <button
            type="button"
            disabled={busy || fotos.length === 0}
            onClick={() => void handleComplete()}
            className="block rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Marcar como concluída
          </button>
        </div>
      )}

      {stage.status === 'paga_retida' && isClient && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleCancel()}
          className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          Cancelar e reembolsar
        </button>
      )}

      {stage.status === 'concluida_aguardando' && (
        <div className="mt-3 space-y-2">
          {stage.fotos_conclusao.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stage.fotos_conclusao.map((url) => (
                <img key={url} src={url} className="h-16 w-16 rounded-lg object-cover" />
              ))}
            </div>
          )}
          {stage.prazo_aprovacao && (
            <p className="text-xs text-slate-400">
              Prazo para aprovar: {new Date(stage.prazo_aprovacao).toLocaleString('pt-BR')} (auto-aprova
              depois disso)
            </p>
          )}
          {isClient && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleApprove()}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                Aprovar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDisputeOpen((v) => !v)}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                Contestar
              </button>
            </div>
          )}
          {disputeOpen && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo da contestação"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setDisputeFotos(Array.from(e.target.files ?? []))}
                className="text-sm"
              />
              <button
                type="button"
                disabled={busy || !motivo.trim()}
                onClick={() => void handleDispute()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                Enviar contestação
              </button>
            </div>
          )}
        </div>
      )}

      {stage.status === 'contestada' && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {dispute ? (
            <>
              <p>Motivo: {dispute.motivo}</p>
              <p className="mt-1 text-xs">
                {dispute.resolvida_em
                  ? `Resolvida (${dispute.decisao}) em ${new Date(dispute.resolvida_em).toLocaleDateString('pt-BR')}`
                  : 'Em análise pelo admin.'}
              </p>
            </>
          ) : (
            'Em análise pelo admin.'
          )}
        </div>
      )}
    </li>
  )
}
