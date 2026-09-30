import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import type { Job, JobStage } from '@/lib/types'

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
  const [job, setJob] = useState<Job | null>(null)
  const [stages, setStages] = useState<JobStage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: j }, { data: s }] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, proposal_id, cliente_id, professional_id, status, comprovante_hash, iniciado_em, concluido_em')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('job_stages')
          .select('id, job_id, ordem, descricao, valor, status')
          .eq('job_id', id)
          .order('ordem'),
      ])
      setJob((j as Job) ?? null)
      setStages((s as JobStage[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [id])

  if (loading) return <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>

  if (!job) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-slate-500">Obra não encontrada ou sem acesso.</p>
        <Link to="/obras" className="text-brand-600 underline">
          Voltar
        </Link>
      </div>
    )
  }

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

      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
        O Pagamento Garantido (retenção, liberação por etapa, contestação)
        chega na próxima etapa do produto. Por enquanto esta tela só mostra
        as etapas combinadas na proposta.
      </div>

      <ul className="space-y-3">
        {stages.map((s) => (
          <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">
                {s.ordem}. {s.descricao}
              </p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {STAGE_STATUS_LABEL[s.status] ?? s.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">R$ {s.valor.toFixed(2)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
