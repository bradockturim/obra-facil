import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AdminRoute } from '@/features/auth/AdminRoute'
import { AppShell } from '@/components/AppShell'
import { HomePage } from '@/routes/HomePage'
import { CategoryListPage } from '@/features/catalog/CategoryListPage'
import { ProfessionalPublicPage } from '@/features/professionals/ProfessionalPublicPage'
import { OnboardingPage } from '@/features/professionals/OnboardingPage'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { VerificationQueuePage } from '@/features/admin/VerificationQueuePage'
import { CategoriesAdminPage } from '@/features/admin/CategoriesAdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/categorias/:slug" element={<CategoryListPage />} />
            <Route path="/profissionais/:id" element={<ProfessionalPublicPage />} />
            <Route
              path="/profissional/cadastro"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to="verificacoes" replace />} />
              <Route path="verificacoes" element={<VerificationQueuePage />} />
              <Route path="categorias" element={<CategoriesAdminPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
