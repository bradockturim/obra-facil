import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
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

  if (loading) return <p className="text-sm text-slate-400">Carregando...</p>

  const gmv = payments.reduce((sum, p) => (p.status === 'liberado' ? sum + p.valor : sum), 0)
  const comissao = payments.reduce((sum, p) => (p.status === 'liberado' ? sum + p.taxa_plataforma : sum), 0)

  return (
    <div className="space-y-4">
      <div className="flex gap-6 rounded-xl bg-white p-4 text-sm shadow-sm">
        <div>
          <p className="text-slate-400">GMV simulado (liberado)</p>
          <p className="text-lg font-bold text-slate-800">R$ {gmv.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-400">Comissão simulada</p>
          <p className="text-lg font-bold text-slate-800">R$ {comissao.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Etapa</th>
              <th className="px-4 py-2">Método</th>
              <th className="px-4 py-2">Valor</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Criado em</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">{p.job_stages?.descricao ?? '—'}</td>
                <td className="px-4 py-2 text-slate-500">{p.metodo}</td>
                <td className="px-4 py-2 text-slate-700">R$ {p.valor.toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-slate-400">
                  {new Date(p.criado_em).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-2 text-right text-xs">
                  {p.status === 'pendente' && (
                    <>
                      <button
                        disabled={busyId === p.id}
                        onClick={() => void forcar(p.id, 'falhar')}
                        className="mr-2 text-red-600 underline"
                      >
                        Forçar falha
                      </button>
                      <button
                        disabled={busyId === p.id}
                        onClick={() => void forcar(p.id, 'expirar')}
                        className="text-amber-600 underline"
                      >
                        Expirar
                      </button>
                    </>
                  )}
                  {p.status === 'pago_retido' && (
                    <button
                      disabled={busyId === p.id}
                      onClick={() => void forcar(p.id, 'estornar')}
                      className="text-red-600 underline"
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
