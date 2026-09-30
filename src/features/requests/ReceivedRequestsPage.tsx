import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, MessageCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'

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

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pedidos recebidos</h1>
      {targets.length === 0 ? (
        <EmptyState icon={Inbox} title="Nenhum pedido recebido ainda" />
      ) : (
        <div className="space-y-3">
          {targets.map((t) => {
            const conv = conversations.find((c) => c.request_id === t.request_id)
            return (
              <Card key={t.request_id}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">
                    {t.service_requests?.categories?.nome ?? 'Serviço'}
                  </p>
                  <Badge>{t.status}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {t.service_requests?.descricao}
                </p>
                {conv && (
                  <Link
                    to={`/conversas/${conv.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Conversar com {conv.profiles?.nome ?? 'cliente'}
                  </Link>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
