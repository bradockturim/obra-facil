import { useEffect, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Percent, Undo2, Wallet } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { DemoBanner } from '@/components/DemoBanner'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import type { LedgerEntry, LedgerEntryTipo } from '@/lib/types'

const TIPO_LABEL: Record<LedgerEntryTipo, string> = {
  credito_retido: 'Retido',
  credito_liberado: 'Liberado',
  taxa: 'Taxa da plataforma',
  estorno: 'Estornado',
}

const TIPO_ICON: Record<LedgerEntryTipo, typeof Wallet> = {
  credito_retido: ArrowDownCircle,
  credito_liberado: ArrowUpCircle,
  taxa: Percent,
  estorno: Undo2,
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

  if (loading) return <PageLoader />

  const totals = entries.reduce<Record<LedgerEntryTipo, number>>(
    (acc, e) => {
      acc[e.tipo] += e.valor
      return acc
    },
    { credito_retido: 0, credito_liberado: 0, taxa: 0, estorno: 0 },
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financeiro</h1>
      <DemoBanner />

      <Card className="bg-gradient-to-br from-brand-600 to-brand-700 text-white">
        <p className="text-sm text-brand-100">Saldo simulado</p>
        <p className="text-3xl font-bold">R$ {totals.credito_liberado.toFixed(2)}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-xl bg-white/10 py-2">
            <p className="text-brand-100">Retido</p>
            <p className="font-semibold">R$ {totals.credito_retido.toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-white/10 py-2">
            <p className="text-brand-100">Taxas</p>
            <p className="font-semibold">R$ {totals.taxa.toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-white/10 py-2">
            <p className="text-brand-100">Estornado</p>
            <p className="font-semibold">R$ {totals.estorno.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Extrato</h2>
        {entries.length === 0 ? (
          <EmptyState icon={Wallet} title="Nenhuma movimentação ainda" />
        ) : (
          <div className="space-y-2">
            {entries.map((e) => {
              const Icon = TIPO_ICON[e.tipo]
              return (
                <Card key={e.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{TIPO_LABEL[e.tipo]}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(e.criado_em).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-800">R$ {e.valor.toFixed(2)}</p>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
