import { useEffect, useState } from 'react'
import { FileText, ShieldCheck, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import type { Profile } from '@/lib/types'

interface QueueItem {
  id: string
  user_id: string
  doc_url: string
  selfie_url: string
  referencia: string | null
  status: string
  created_at: string
  profiles: Pick<Profile, 'nome' | 'whatsapp'> | null
}

export function VerificationQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('verification_docs')
      .select('id, user_id, doc_url, selfie_url, referencia, status, created_at, profiles(nome, whatsapp)')
      .eq('status', 'em_analise')
      .order('created_at', { ascending: true })
    setItems((data as unknown as QueueItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function openSigned(path: string) {
    const { data, error } = await supabase.storage
      .from('verification-docs')
      .createSignedUrl(path, 60)
    if (error || !data) {
      window.alert('Não foi possível abrir o arquivo: ' + (error?.message ?? 'erro desconhecido'))
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function decide(item: QueueItem, decision: 'aprovado' | 'rejeitado') {
    setBusyId(item.id)
    await supabase
      .from('professional_profiles')
      .update({
        docs_status: decision,
        verificado: decision === 'aprovado',
        verificado_em: decision === 'aprovado' ? new Date().toISOString() : null,
      })
      .eq('user_id', item.user_id)
    await supabase.from('verification_docs').update({ status: decision }).eq('id', item.id)
    setBusyId(null)
    void load()
  }

  if (loading) return <PageLoader />

  if (items.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Fila de verificação vazia" />
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-800">{item.profiles?.nome ?? 'Sem nome'}</p>
              <p className="text-sm text-slate-500">{item.profiles?.whatsapp ?? 'sem WhatsApp'}</p>
              {item.referencia && (
                <p className="mt-1 text-sm text-slate-500">Referência: {item.referencia}</p>
              )}
              <div className="mt-2 flex gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => openSigned(item.doc_url)}
                  className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                >
                  <FileText className="h-3.5 w-3.5" /> Ver documento
                </button>
                <button
                  type="button"
                  onClick={() => openSigned(item.selfie_url)}
                  className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                >
                  <FileText className="h-3.5 w-3.5" /> Ver selfie
                </button>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="success"
              size="sm"
              disabled={busyId === item.id}
              onClick={() => decide(item, 'aprovado')}
            >
              Aprovar
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busyId === item.id}
              onClick={() => decide(item, 'rejeitado')}
            >
              Rejeitar
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
