import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, HardHat } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import type { Job } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  em_disputa: 'Em disputa',
}

const STATUS_TONE: Record<string, BadgeTone> = {
  em_andamento: 'info',
  concluida: 'success',
  cancelada: 'neutral',
  em_disputa: 'danger',
}

export function JobListPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('jobs')
      .select('id, proposal_id, cliente_id, professional_id, status, comprovante_hash, iniciado_em, concluido_em')
      .or(`cliente_id.eq.${user.id},professional_id.eq.${user.id}`)
      .order('iniciado_em', { ascending: false })
      .then(({ data }) => {
        setJobs((data as Job[]) ?? [])
        setLoading(false)
      })
  }, [user])

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Minhas obras</h1>
      {jobs.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="Nenhuma obra ainda"
          description="Elas aparecem aqui assim que uma proposta é aceita."
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Link key={j.id} to={`/obras/${j.id}`}>
              <Card interactive className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Iniciada em {new Date(j.iniciado_em).toLocaleDateString('pt-BR')}
                </p>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[j.status] ?? 'neutral'}>
                    {STATUS_LABEL[j.status] ?? j.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
