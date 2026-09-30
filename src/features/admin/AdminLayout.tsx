import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`

export function AdminLayout() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Admin</h1>
      <nav className="flex gap-2">
        <NavLink to="/admin/verificacoes" className={linkClass}>
          Fila de verificação
        </NavLink>
        <NavLink to="/admin/categorias" className={linkClass}>
          Categorias
        </NavLink>
        <NavLink to="/admin/financeiro" className={linkClass}>
          Financeiro
        </NavLink>
        <NavLink to="/admin/contestacoes" className={linkClass}>
          Contestações
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
