import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { DemoBanner } from '@/components/DemoBanner'
import type { LedgerEntry, LedgerEntryTipo } from '@/lib/types'

const TIPO_LABEL: Record<LedgerEntryTipo, string> = {
  credito_retido: 'Retido',
  credito_liberado: 'Liberado',
  taxa: 'Taxa da plataforma',
  estorno: 'Estornado',
}

export function ProfessionalLedgerPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('ledger_entries')
      .select('id, user_id, payment_id, tipo, valor, simulado, criado_em')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        setEntries((data as LedgerEntry[]) ?? [])
        setLoading(false)
      })
  }, [user])

  if (loading) return <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>

  const totals = entries.reduce<Record<LedgerEntryTipo, number>>(
    (acc, e) => {
      acc[e.tipo] += e.valor
      return acc
    },
    { credito_retido: 0, credito_liberado: 0, taxa: 0, estorno: 0 },
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
      <DemoBanner />

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Saldo simulado</p>
        <p className="text-3xl font-bold text-brand-700">
          R$ {totals.credito_liberado.toFixed(2)}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <p className="text-slate-400">Retido</p>
            <p className="font-semibold text-slate-700">R$ {totals.credito_retido.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-400">Taxas</p>
            <p className="font-semibold text-slate-700">R$ {totals.taxa.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-400">Estornado</p>
            <p className="font-semibold text-slate-700">R$ {totals.estorno.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Extrato</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma movimentação ainda.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-700">{TIPO_LABEL[e.tipo]}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(e.criado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
                <p className="font-semibold text-slate-800">R$ {e.valor.toFixed(2)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
