import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import type { Payment } from '@/lib/types'

interface PaymentRow extends Payment {
  job_stages: { descricao: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  pago_retido: 'Retido',
  liberado: 'Liberado',
  reembolsado: 'Reembolsado',
  falhou: 'Falhou',
  expirado: 'Expirado',
}

const STATUS_TONE: Record<string, BadgeTone> = {
  pendente: 'neutral',
  pago_retido: 'info',
  liberado: 'success',
  reembolsado: 'warning',
  falhou: 'danger',
  expirado: 'danger',
}

export function FinanceAdminPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('payments')
      .select(
        'id, stage_id, provider, metodo, valor, taxa_plataforma, valor_liquido, status, simulado, criado_em, pago_em, liberado_em, job_stages(descricao)',
      )
      .order('criado_em', { ascending: false })
    setPayments((data as unknown as PaymentRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function forcar(paymentId: string, acao: 'falhar' | 'expirar' | 'estornar') {
    setBusyId(paymentId)
    const { error } = await supabase.rpc('admin_force_payment', { p_payment_id: paymentId, p_acao: acao })
    if (error) window.alert(error.message)
    await load()
    setBusyId(null)
  }

  if (loading) return <PageLoader />

  const gmv = payments.reduce((sum, p) => (p.status === 'liberado' ? sum + p.valor : sum), 0)
  const comissao = payments.reduce((sum, p) => (p.status === 'liberado' ? sum + p.taxa_plataforma : sum), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-slate-400">GMV simulado (liberado)</p>
          <p className="text-2xl font-bold text-slate-900">R$ {gmv.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Comissão simulada</p>
          <p className="text-2xl font-bold text-slate-900">R$ {comissao.toFixed(2)}</p>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Etapa</th>
              <th className="px-4 py-2.5 font-medium">Método</th>
              <th className="px-4 py-2.5 font-medium">Valor</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Criado em</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 text-slate-700">{p.job_stages?.descricao ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-500 capitalize">{p.metodo}</td>
                <td className="px-4 py-2.5 text-slate-700">R$ {p.valor.toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-400">
                  {new Date(p.criado_em).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-2.5 text-right text-xs">
                  {p.status === 'pendente' && (
                    <>
                      <button
                        disabled={busyId === p.id}
                        onClick={() => void forcar(p.id, 'falhar')}
                        className="mr-3 text-danger-600 hover:underline"
                      >
                        Forçar falha
                      </button>
                      <button
                        disabled={busyId === p.id}
                        onClick={() => void forcar(p.id, 'expirar')}
                        className="text-warning-600 hover:underline"
                      >
                        Expirar
                      </button>
                    </>
                  )}
                  {p.status === 'pago_retido' && (
                    <button
                      disabled={busyId === p.id}
                      onClick={() => void forcar(p.id, 'estornar')}
                      className="text-danger-600 hover:underline"
                    >
                      Estornar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
