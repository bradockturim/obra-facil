import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ChevronLeft, Copy, QrCode } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { DemoBanner } from '@/components/DemoBanner'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import type { Job, JobStage } from '@/lib/types'

export function CheckoutPage() {
  const { jobId, stageId } = useParams<{ jobId: string; stageId: string }>()
  const { user } = useAuth()

  const [job, setJob] = useState<Job | null>(null)
  const [stage, setStage] = useState<JobStage | null>(null)
  const [chavePix, setChavePix] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notAllowed, setNotAllowed] = useState(false)
  const [metodo, setMetodo] = useState<'pix' | 'cartao'>('pix')
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: j } = await supabase
        .from('jobs')
        .select('id, proposal_id, cliente_id, professional_id, status, comprovante_hash, iniciado_em, concluido_em')
        .eq('id', jobId)
        .maybeSingle()
      if (!j || j.cliente_id !== user!.id) {
        setNotAllowed(true)
        setLoading(false)
        return
      }
      setJob(j as Job)

      const [{ data: s }, { data: pro }] = await Promise.all([
        supabase
          .from('job_stages')
          .select('id, job_id, ordem, descricao, valor, status, fotos_conclusao, prazo_aprovacao')
          .eq('id', stageId)
          .maybeSingle(),
        supabase
          .from('professional_profiles')
          .select('chave_pix')
          .eq('user_id', j.professional_id)
          .maybeSingle(),
      ])
      setStage((s as JobStage) ?? null)
      setChavePix(pro?.chave_pix ?? null)
      if (s?.status === 'paga_retida' || s?.status === 'concluida_aguardando' || s?.status === 'liberada') {
        setConfirmed(true)
      }
      setLoading(false)
    }
    if (user) void load()
  }, [jobId, stageId, user])

  async function simularPagamento() {
    if (!stage) return
    setConfirming(true)
    setError(null)
    try {
      const { data: payment, error: createError } = await supabase.rpc('payments_create', {
        p_stage_id: stage.id,
        p_metodo: metodo,
      })
      if (createError) throw createError

      const { error: confirmError } = await supabase.rpc('payments_confirm', {
        p_payment_id: payment.id,
      })
      if (confirmError) throw confirmError

      setConfirmed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pagamento.')
    } finally {
      setConfirming(false)
    }
  }

  function copiarChave() {
    if (!chavePix) return
    void navigator.clipboard.writeText(chavePix)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <PageLoader />

  if (notAllowed || !job || !stage) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-slate-500">Etapa não encontrada ou sem acesso.</p>
        <Link to="/obras" className="text-brand-600 underline">
          Voltar
        </Link>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
        <Card className="space-y-4 text-center">
          <Badge tone="success">Retida</Badge>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pagamento confirmado</h1>
            <p className="mt-1 text-sm text-slate-500">
              O valor da etapa "{stage.descricao}" está retido até a
              aprovação da conclusão.
            </p>
          </div>

          <DemoBanner />

          {chavePix && (
            <div className="rounded-xl bg-slate-50 p-4 text-left">
              <p className="text-sm font-medium text-slate-700">
                Pagar o profissional agora (Pix direto)
              </p>
              <p className="mt-1 break-all font-mono text-sm text-slate-600">{chavePix}</p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={copiarChave}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado!' : 'Copiar chave Pix'}
              </Button>
            </div>
          )}

          <Link to={`/obras/${job.id}`}>
            <Button className="w-full">Ver acompanhamento da obra</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <Link
          to={`/obras/${job.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand-600"
        >
          <ChevronLeft className="h-4 w-4" /> Acompanhamento da obra
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Pagar etapa</h1>
      </div>

      <DemoBanner />

      <Card>
        <p className="font-semibold text-slate-800">{stage.descricao}</p>
        <p className="mt-1 text-2xl font-bold text-brand-700">R$ {stage.valor.toFixed(2)}</p>
        <p className="mt-2 text-sm text-slate-500">
          Esse valor fica retido pelo Obra Fácil até você aprovar a
          conclusão da etapa. Só então é liberado ao profissional.
        </p>

        <div className="mt-6 flex gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setMetodo('pix')}
            className={`px-3 py-2 text-sm font-medium transition ${metodo === 'pix' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Pix
          </button>
          <button
            type="button"
            onClick={() => setMetodo('cartao')}
            className={`px-3 py-2 text-sm font-medium transition ${metodo === 'cartao' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Cartão
          </button>
        </div>

        {metodo === 'pix' ? (
          <div className="mt-4 space-y-3">
            <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
              <QrCode className="h-16 w-16 text-slate-300" strokeWidth={1} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pix copia e cola (demonstração)</p>
              <p className="mt-1 break-all rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-600">
                00020126obrafacil-demo{stage.id.replace(/-/g, '').slice(0, 20)}5204000053039865802BR5913OBRA
                FACIL DEMO6009TRES RIOS62070503***6304ABCD
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <input
              disabled
              value="4242 4242 4242 4242"
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
            />
            <div className="flex gap-3">
              <input
                disabled
                value="12/29"
                className="w-24 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
              />
              <input
                disabled
                value="123"
                className="w-24 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
              />
              <input
                disabled
                value="CARTAO DEMONSTRACAO"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <p className="text-xs text-slate-400">
              Cartão de demonstração — campos bloqueados. Nenhum dado real
              é digitado ou armazenado.
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}

        <Button className="mt-6 w-full" disabled={confirming} onClick={() => void simularPagamento()}>
          {confirming ? 'Processando...' : 'Simular pagamento'}
        </Button>
      </Card>
    </div>
  )
}
