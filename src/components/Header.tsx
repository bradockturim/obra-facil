import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  HardHat,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { LinkButton } from '@/components/ui/Button'

export function Header() {
  const { session, profile, isAdmin, signOut } = useAuth()
  const isProfessional = profile?.papeis?.includes('profissional') ?? false
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <HardHat className="h-4.5 w-4.5" />
          </span>
          Obra Fácil
        </Link>

        <nav className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Link to="/" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-brand-700">
            Início
          </Link>

          {session ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                Menu
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl bg-white py-1.5 shadow-lg ring-1 ring-slate-200">
                  {isProfessional ? (
                    <MenuLink
                      to="/pedidos/recebidos"
                      icon={Inbox}
                      label="Pedidos recebidos"
                      onClick={() => setMenuOpen(false)}
                    />
                  ) : (
                    <>
                      <MenuLink
                        to="/pedidos"
                        icon={Inbox}
                        label="Meus pedidos"
                        onClick={() => setMenuOpen(false)}
                      />
                      <MenuLink
                        to="/profissional/cadastro"
                        icon={HardHat}
                        label="Sou profissional"
                        onClick={() => setMenuOpen(false)}
                      />
                    </>
                  )}
                  {isProfessional && (
                    <MenuLink
                      to="/financeiro"
                      icon={Wallet}
                      label="Financeiro"
                      onClick={() => setMenuOpen(false)}
                    />
                  )}
                  <MenuLink
                    to="/obras"
                    icon={ClipboardList}
                    label="Minhas obras"
                    onClick={() => setMenuOpen(false)}
                  />
                  {isAdmin && (
                    <MenuLink
                      to="/admin/verificacoes"
                      icon={LayoutDashboard}
                      label="Admin"
                      onClick={() => setMenuOpen(false)}
                    />
                  )}
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <LinkButton to="/login" size="sm">
              Entrar
            </LinkButton>
          )}
        </nav>
      </div>
    </header>
  )
}

function MenuLink({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string
  icon: typeof Inbox
  label: string
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 text-slate-400" />
      {label}
    </Link>
  )
}
