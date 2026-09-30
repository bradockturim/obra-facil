import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { session, loading, signInWithGoogle, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<
    { type: 'idle' } | { type: 'sending' } | { type: 'sent' } | { type: 'error'; message: string }
  >({ type: 'idle' })

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus({ type: 'sending' })
    const { error } = await signInWithEmail(email)
    if (error) {
      setStatus({ type: 'error', message: error })
    } else {
      setStatus({ type: 'sent' })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-brand-700">Obra Fácil</h1>
          <p className="text-sm text-slate-500">
            Profissionais de construção e reforma verificados em Três Rios.
          </p>
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Entrar com Google
        </button>

        <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          ou
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Link mágico por e-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={status.type === 'sending'}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {status.type === 'sending' ? 'Enviando...' : 'Enviar link de acesso'}
          </button>
          {status.type === 'sent' && (
            <p className="text-sm text-green-600">
              Link enviado! Confira sua caixa de entrada.
            </p>
          )}
          {status.type === 'error' && (
            <p className="text-sm text-red-600">{status.message}</p>
          )}
        </form>
      </div>
    </div>
  )
}
