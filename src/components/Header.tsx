import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

export function Header() {
  const { session, profile, isAdmin, signOut } = useAuth()
  const isProfessional = profile?.papeis?.includes('profissional') ?? false

  return (
    <header className="border-b border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-brand-700">
          Obra Fácil
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-brand-700">
            Início
          </Link>
          {session ? (
            <>
              {isProfessional ? (
                <>
                  <Link to="/pedidos/recebidos" className="hover:text-brand-700">
                    Pedidos recebidos
                  </Link>
                  <Link to="/financeiro" className="hover:text-brand-700">
                    Financeiro
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/pedidos" className="hover:text-brand-700">
                    Meus pedidos
                  </Link>
                  <Link to="/profissional/cadastro" className="hover:text-brand-700">
                    Sou profissional
                  </Link>
                </>
              )}
              <Link to="/obras" className="hover:text-brand-700">
                Minhas obras
              </Link>
              {isAdmin && (
                <Link to="/admin/verificacoes" className="hover:text-brand-700">
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={signOut}
                className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
