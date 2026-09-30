import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Dispute } from '@/lib/types'

interface DisputeRow extends Dispute {
  job_stages: { descricao: string; valor: number } | null
  profiles: { nome: string | null } | null
}

export function DisputesAdminPage() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [splitValues, setSplitValues] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('disputes')
      .select(
        'id, stage_id, aberta_por, motivo, fotos, decisao, valor_cliente, valor_profissional, resolvida_em, created_at, job_stages(descricao, valor), profiles!disputes_aberta_por_fkey(nome)',
      )
      .is('resolvida_em', null)
      .order('created_at', { ascending: true })
    setDisputes((data as unknown as DisputeRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function resolver(d: DisputeRow, decisao: 'liberar' | 'reembolsar' | 'dividir') {
    setBusyId(d.id)
    const valorTotal = d.job_stages?.valor ?? 0
    const valorProfissional =
      decisao === 'dividir' ? parseFloat(splitValues[d.id] ?? '0') : decisao === 'liberar' ? valorTotal : null
    const valorCliente =
      decisao === 'dividir'
        ? valorTotal - (valorProfissional ?? 0)
        : decisao === 'reembolsar'
          ? valorTotal
          : null

    const { error } = await supabase.rpc('dispute_resolve', {
      p_dispute_id: d.id,
      p_decisao: decisao,
      p_valor_cliente: valorCliente,
      p_valor_profissional: valorProfissional,
    })
    if (error) window.alert(error.message)
    await load()
    setBusyId(null)
  }

  if (loading) return <p className="text-sm text-slate-400">Carregando...</p>

  if (disputes.length === 0) {
    return <p className="text-sm text-slate-400">Nenhuma contestação em aberto.</p>
  }

  return (
    <ul className="space-y-4">
      {disputes.map((d) => (
        <li key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-semibold text-slate-800">{d.job_stages?.descricao ?? 'Etapa'}</p>
          <p className="text-sm text-slate-500">
            Valor da etapa: R$ {(d.job_stages?.valor ?? 0).toFixed(2)} · Aberta por{' '}
            {d.profiles?.nome ?? 'cliente'}
          </p>
          <p className="mt-2 text-sm text-slate-700">{d.motivo}</p>
          {d.fotos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {d.fotos.map((url) => (
                <img key={url} src={url} className="h-16 w-16 rounded-lg object-cover" />
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              disabled={busyId === d.id}
              onClick={() => void resolver(d, 'liberar')}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              Liberar ao profissional
            </button>
            <button
              disabled={busyId === d.id}
              onClick={() => void resolver(d, 'reembolsar')}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              Reembolsar cliente
            </button>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="R$ para o profissional"
              value={splitValues[d.id] ?? ''}
              onChange={(e) => setSplitValues((prev) => ({ ...prev, [d.id]: e.target.value }))}
              className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              disabled={busyId === d.id || !splitValues[d.id]}
              onClick={() => void resolver(d, 'dividir')}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              Dividir
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
