import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import type { Job, JobStage, Profile, Proposal } from '@/lib/types'

export function ReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [stages, setStages] = useState<JobStage[]>([])
  const [cliente, setCliente] = useState<Profile | null>(null)
  const [profissional, setProfissional] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: j } = await supabase
        .from('jobs')
        .select('id, proposal_id, cliente_id, professional_id, status, comprovante_hash, iniciado_em, concluido_em')
        .eq('id', id)
        .maybeSingle()
      if (!j) {
        setLoading(false)
        return
      }
      setJob(j as Job)

      const [{ data: p }, { data: s }, { data: people }] = await Promise.all([
        supabase
          .from('proposals')
          .select('id, conversation_id, valor_total, prazo_dias, material_por, observacoes, status, created_at')
          .eq('id', j.proposal_id)
          .maybeSingle(),
        supabase
          .from('job_stages')
          .select('id, job_id, ordem, descricao, valor, status')
          .eq('job_id', j.id)
          .order('ordem'),
        supabase
          .from('profiles')
          .select('id, nome, whatsapp, foto_url, papeis, cidade_id, status')
          .in('id', [j.cliente_id, j.professional_id]),
      ])
      setProposal((p as Proposal) ?? null)
      setStages((s as JobStage[]) ?? [])
      const list = (people as Profile[]) ?? []
      setCliente(list.find((x) => x.id === j.cliente_id) ?? null)
      setProfissional(list.find((x) => x.id === j.professional_id) ?? null)
      setLoading(false)
    }
    void load()
  }, [id])

  if (loading) return <PageLoader />

  if (!job) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-slate-500">Comprovante não encontrado ou sem acesso.</p>
        <Link to="/obras" className="text-brand-600 underline">
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 print:px-0 print:py-0">
      <div className="flex items-center justify-between print:hidden">
        <Link
          to={`/obras/${job.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand-600"
        >
          <ChevronLeft className="h-4 w-4" /> Acompanhamento da obra
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir / salvar PDF
        </Button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
        <h1 className="text-xl font-bold text-slate-800">Comprovante do acordo — Obra Fácil</h1>
        <p className="mt-1 text-xs text-slate-400">
          Código: {job.comprovante_hash} · Gerado em{' '}
          {new Date(job.iniciado_em).toLocaleString('pt-BR')}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-slate-700">Cliente</p>
            <p className="text-slate-600">{cliente?.nome ?? '—'}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Profissional</p>
            <p className="text-slate-600">{profissional?.nome ?? '—'}</p>
          </div>
        </div>

        {proposal && (
          <div className="mt-4 text-sm text-slate-600">
            <p>
              Valor total: <span className="font-semibold">R$ {proposal.valor_total.toFixed(2)}</span>
            </p>
            <p>Prazo: {proposal.prazo_dias} dia(s)</p>
            {proposal.observacoes && <p>Observações: {proposal.observacoes}</p>}
          </div>
        )}

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-1">Etapa</th>
              <th className="py-1 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="py-1.5 text-slate-700">
                  {s.ordem}. {s.descricao}
                </td>
                <td className="py-1.5 text-right text-slate-700">R$ {s.valor.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Este comprovante registra o acordo entre as partes dentro do Obra
          Fácil. O Pagamento Garantido (checkout, retenção e liberação por
          etapa) chega na próxima etapa do produto — até lá, o pagamento é
          combinado diretamente entre cliente e profissional.
        </div>
      </div>
    </div>
  )
}
