import { useAuth } from '@/features/auth/AuthContext'

export function HomePage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-brand-700">Obra Fácil</h1>
        <p className="text-slate-600">
          Logado como <span className="font-medium">{user?.email}</span>.
        </p>
        <p className="text-sm text-slate-500">
          Semana 1 concluída: setup, schema + RLS e login. As próximas telas
          (categorias, pedidos, chat, propostas e Pagamento Garantido
          simulado) entram nas próximas etapas do roadmap.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
