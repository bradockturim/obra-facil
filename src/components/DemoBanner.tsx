import { Sparkles } from 'lucide-react'

export function DemoBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-700 ring-1 ring-warning-600/10">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <strong className="font-semibold">Modo demonstração</strong> —
        nenhum valor é cobrado. Combine o pagamento diretamente com o
        profissional.
      </p>
    </div>
  )
}
