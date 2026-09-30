import { NavLink, Outlet } from 'react-router-dom'
import { BadgeCheck, LayoutGrid, Megaphone, MessageSquareWarning, ShieldCheck, Wallet } from 'lucide-react'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20' : 'text-slate-600 hover:bg-slate-100'
  }`

const TABS = [
  { to: '/admin/verificacoes', label: 'Verificação', icon: ShieldCheck },
  { to: '/admin/categorias', label: 'Categorias', icon: LayoutGrid },
  { to: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/admin/contestacoes', label: 'Contestações', icon: MessageSquareWarning },
  { to: '/admin/anuncios', label: 'Anúncios', icon: Megaphone },
]

export function AdminLayout() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-6 w-6 text-brand-600" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin</h1>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={linkClass}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
