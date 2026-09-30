import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckCircle2, HardHat, Mail } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/fields'
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
            <HardHat className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Obra Fácil</h1>
          <p className="text-sm text-slate-500">
            Profissionais de construção e reforma verificados em Três Rios.
          </p>
        </div>

        <Button variant="secondary" className="w-full" onClick={() => void signInWithGoogle()}>
          Entrar com Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          ou
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <Input
            id="email"
            label="Link mágico por e-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
          <Button type="submit" className="w-full" disabled={status.type === 'sending'}>
            <Mail className="h-4 w-4" />
            {status.type === 'sending' ? 'Enviando...' : 'Enviar link de acesso'}
          </Button>
          {status.type === 'sent' && (
            <p className="flex items-center gap-1.5 text-sm text-success-600">
              <CheckCircle2 className="h-4 w-4" /> Link enviado! Confira sua caixa de entrada.
            </p>
          )}
          {status.type === 'error' && <p className="text-sm text-danger-600">{status.message}</p>}
        </form>
      </Card>
    </div>
  )
}
