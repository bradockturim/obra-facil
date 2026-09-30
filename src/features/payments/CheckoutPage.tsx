import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { DemoBanner } from '@/components/DemoBanner'
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

  if (loading) return <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>

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
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
            Retida
          </p>
          <h1 className="mt-3 text-xl font-bold text-slate-800">Pagamento confirmado</h1>
          <p className="mt-1 text-sm text-slate-500">
            O valor da etapa "{stage.descricao}" está retido até a
            aprovação da conclusão.
          </p>

          <DemoBanner />

          {chavePix && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-left">
              <p className="text-sm font-medium text-slate-700">
                Pagar o profissional agora (Pix direto)
              </p>
              <p className="mt-1 break-all font-mono text-sm text-slate-600">{chavePix}</p>
              <button
                type="button"
                onClick={copiarChave}
                className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                {copied ? 'Copiado!' : 'Copiar chave Pix'}
              </button>
            </div>
          )}

          <Link
            to={`/obras/${job.id}`}
            className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Ver acompanhamento da obra
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <Link to={`/obras/${job.id}`} className="text-sm text-slate-400 hover:text-brand-600">
          ← Acompanhamento da obra
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">Pagar etapa</h1>
      </div>

      <DemoBanner />

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
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
            className={`px-3 py-2 text-sm font-medium ${metodo === 'pix' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'}`}
          >
            Pix
          </button>
          <button
            type="button"
            onClick={() => setMetodo('cartao')}
            className={`px-3 py-2 text-sm font-medium ${metodo === 'cartao' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'}`}
          >
            Cartão
          </button>
        </div>

        {metodo === 'pix' ? (
          <div className="mt-4 space-y-3">
            <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
              QR Pix (demonstração)
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

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={() => void simularPagamento()}
          disabled={confirming}
          className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {confirming ? 'Processando...' : 'Simular pagamento'}
        </button>
      </div>
    </div>
  )
}
