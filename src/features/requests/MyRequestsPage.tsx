import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, MessageCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'

interface RequestRow {
  id: string
  descricao: string
  status: string
  created_at: string
  categories: { nome: string } | null
}

interface ConversationRow {
  id: string
  request_id: string
  profiles: { nome: string | null } | null
}

export function MyRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [{ data: reqs }, { data: convs }] = await Promise.all([
        supabase
          .from('service_requests')
          .select('id, descricao, status, created_at, categories(nome)')
          .eq('cliente_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('conversations')
          .select('id, request_id, profiles!conversations_professional_id_fkey(nome)')
          .eq('cliente_id', user!.id),
      ])
      setRequests((reqs as unknown as RequestRow[]) ?? [])
      setConversations((convs as unknown as ConversationRow[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [user])

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meus pedidos</h1>
      {requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Você ainda não pediu nenhum orçamento"
          description="Escolha uma categoria na Home e visite o perfil de um profissional."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const convs = conversations.filter((c) => c.request_id === r.id)
            return (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{r.categories?.nome ?? 'Serviço'}</p>
                  <Badge>{r.status}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{r.descricao}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {convs.map((c) => (
                    <Link
                      key={c.id}
                      to={`/conversas/${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Conversar com {c.profiles?.nome ?? 'profissional'}
                    </Link>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
