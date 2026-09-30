import { useEffect, useState } from 'react'
import { MessageSquareWarning } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
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

  if (loading) return <PageLoader />

  if (disputes.length === 0) {
    return <EmptyState icon={MessageSquareWarning} title="Nenhuma contestação em aberto" />
  }

  return (
    <div className="space-y-4">
      {disputes.map((d) => (
        <Card key={d.id}>
          <p className="font-semibold text-slate-800">{d.job_stages?.descricao ?? 'Etapa'}</p>
          <p className="text-sm text-slate-500">
            Valor da etapa: R$ {(d.job_stages?.valor ?? 0).toFixed(2)} · Aberta por{' '}
            {d.profiles?.nome ?? 'cliente'}
          </p>
          <p className="mt-2 text-sm text-slate-700">{d.motivo}</p>
          {d.fotos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {d.fotos.map((url) => (
                <img key={url} src={url} className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="success" size="sm" disabled={busyId === d.id} onClick={() => void resolver(d, 'liberar')}>
              Liberar ao profissional
            </Button>
            <Button variant="danger" size="sm" disabled={busyId === d.id} onClick={() => void resolver(d, 'reembolsar')}>
              Reembolsar cliente
            </Button>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="R$ para o profissional"
              value={splitValues[d.id] ?? ''}
              onChange={(e) => setSplitValues((prev) => ({ ...prev, [d.id]: e.target.value }))}
              className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <button
              disabled={busyId === d.id || !splitValues[d.id]}
              onClick={() => void resolver(d, 'dividir')}
              className="rounded-lg bg-warning-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-warning-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Dividir
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}
