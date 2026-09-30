import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import type { Job } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  em_disputa: 'Em disputa',
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

  if (loading) return <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Minhas obras</h1>
      {jobs.length === 0 ? (
        <p className="text-sm text-slate-400">
          Nenhuma obra ainda — elas aparecem aqui assim que uma proposta é aceita.
        </p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link
                to={`/obras/${j.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-500"
              >
                <p className="text-sm text-slate-500">
                  Iniciada em {new Date(j.iniciado_em).toLocaleDateString('pt-BR')}
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {STATUS_LABEL[j.status] ?? j.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
