import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'

interface TargetRow {
  request_id: string
  status: string
  service_requests: {
    descricao: string
    created_at: string
    categories: { nome: string } | null
  } | null
}

interface ConversationRow {
  id: string
  request_id: string
  profiles: { nome: string | null } | null
}

export function ReceivedRequestsPage() {
  const { user } = useAuth()
  const [targets, setTargets] = useState<TargetRow[]>([])
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [{ data: t }, { data: convs }] = await Promise.all([
        supabase
          .from('request_targets')
          .select('request_id, status, service_requests(descricao, created_at, categories(nome))')
          .eq('professional_id', user!.id),
        supabase
          .from('conversations')
          .select('id, request_id, profiles!conversations_cliente_id_fkey(nome)')
          .eq('professional_id', user!.id),
      ])
      setTargets((t as unknown as TargetRow[]) ?? [])
      setConversations((convs as unknown as ConversationRow[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [user])

  if (loading) return <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Pedidos recebidos</h1>
      {targets.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum pedido recebido ainda.</p>
      ) : (
        <ul className="space-y-3">
          {targets.map((t) => {
            const conv = conversations.find((c) => c.request_id === t.request_id)
            return (
              <li key={t.request_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">
                    {t.service_requests?.categories?.nome ?? 'Serviço'}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {t.status}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {t.service_requests?.descricao}
                </p>
                {conv && (
                  <Link
                    to={`/conversas/${conv.id}`}
                    className="mt-3 inline-block rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                  >
                    Conversar com {conv.profiles?.nome ?? 'cliente'}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
