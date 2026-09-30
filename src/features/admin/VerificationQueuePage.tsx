import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
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

  if (loading) return <p className="text-sm text-slate-400">Carregando...</p>

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">Fila de verificação vazia.</p>
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">{item.profiles?.nome ?? 'Sem nome'}</p>
              <p className="text-sm text-slate-500">{item.profiles?.whatsapp ?? 'sem WhatsApp'}</p>
              {item.referencia && (
                <p className="mt-1 text-sm text-slate-500">Referência: {item.referencia}</p>
              )}
              <div className="mt-2 flex gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => openSigned(item.doc_url)}
                  className="text-brand-600 underline"
                >
                  Ver documento
                </button>
                <button
                  type="button"
                  onClick={() => openSigned(item.selfie_url)}
                  className="text-brand-600 underline"
                >
                  Ver selfie
                </button>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => decide(item, 'aprovado')}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                Aprovar
              </button>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => decide(item, 'rejeitado')}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
