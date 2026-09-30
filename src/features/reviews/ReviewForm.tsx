import { useState } from 'react'
import { Star } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { uploadFile, publicUrl } from '@/lib/storage'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/fields'
import { Card } from '@/components/ui/Card'

interface ReviewFormProps {
  jobId: string
  autorId: string
  alvoId: string
  onDone: () => void
}

const CRITERIA: { key: 'qualidade' | 'pontualidade' | 'limpeza' | 'comunicacao'; label: string }[] = [
  { key: 'qualidade', label: 'Qualidade do serviço' },
  { key: 'pontualidade', label: 'Pontualidade' },
  { key: 'limpeza', label: 'Limpeza' },
  { key: 'comunicacao', label: 'Comunicação' },
]

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5">
          <Star
            className={`h-5 w-5 ${n <= value ? 'fill-brand-500 text-brand-500' : 'text-slate-300'}`}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewForm({ jobId, autorId, alvoId, onDone }: ReviewFormProps) {
  const [ratings, setRatings] = useState({ qualidade: 5, pontualidade: 5, limpeza: 5, comunicacao: 5 })
  const [comentario, setComentario] = useState('')
  const [fotos, setFotos] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      const urls: string[] = []
      for (const file of fotos) {
        const path = await uploadFile('obras', autorId, file)
        urls.push(publicUrl('obras', path))
      }
      const notaGeral =
        (ratings.qualidade + ratings.pontualidade + ratings.limpeza + ratings.comunicacao) / 4

      const { error: insertError } = await supabase.from('reviews').insert({
        job_id: jobId,
        autor_id: autorId,
        alvo_id: alvoId,
        qualidade: ratings.qualidade,
        pontualidade: ratings.pontualidade,
        limpeza: ratings.limpeza,
        comunicacao: ratings.comunicacao,
        nota_geral: Math.round(notaGeral * 100) / 100,
        comentario: comentario || null,
        fotos: urls,
      })
      if (insertError) throw insertError
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar avaliação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4">
      <p className="font-semibold text-slate-800">Avalie esta obra</p>
      {CRITERIA.map((c) => (
        <div key={c.key} className="flex items-center justify-between">
          <span className="text-sm text-slate-600">{c.label}</span>
          <StarPicker
            value={ratings[c.key]}
            onChange={(v) => setRatings((prev) => ({ ...prev, [c.key]: v }))}
          />
        </div>
      ))}
      <Textarea
        label="Comentário (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={3}
      />
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Fotos (opcional)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
          className="text-sm"
        />
      </div>
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <Button onClick={() => void handleSubmit()} disabled={busy}>
        {busy ? 'Enviando...' : 'Enviar avaliação'}
      </Button>
    </Card>
  )
}
