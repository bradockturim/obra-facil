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
import { RequestFormPage } from '@/features/requests/RequestFormPage'
import { MyRequestsPage } from '@/features/requests/MyRequestsPage'
import { ReceivedRequestsPage } from '@/features/requests/ReceivedRequestsPage'
import { ConversationPage } from '@/features/chat/ConversationPage'
import { JobListPage } from '@/features/jobs/JobListPage'
import { JobDetailPage } from '@/features/jobs/JobDetailPage'
import { ReceiptPage } from '@/features/jobs/ReceiptPage'
import { CheckoutPage } from '@/features/payments/CheckoutPage'
import { ProfessionalLedgerPage } from '@/features/finance/ProfessionalLedgerPage'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { VerificationQueuePage } from '@/features/admin/VerificationQueuePage'
import { CategoriesAdminPage } from '@/features/admin/CategoriesAdminPage'
import { FinanceAdminPage } from '@/features/admin/FinanceAdminPage'
import { DisputesAdminPage } from '@/features/admin/DisputesAdminPage'
import { AdsAdminPage } from '@/features/admin/AdsAdminPage'

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
              path="/profissionais/:id/pedido"
              element={
                <ProtectedRoute>
                  <RequestFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos"
              element={
                <ProtectedRoute>
                  <MyRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos/recebidos"
              element={
                <ProtectedRoute>
                  <ReceivedRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/conversas/:id"
              element={
                <ProtectedRoute>
                  <ConversationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/obras"
              element={
                <ProtectedRoute>
                  <JobListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/obras/:id"
              element={
                <ProtectedRoute>
                  <JobDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/obras/:id/comprovante"
              element={
                <ProtectedRoute>
                  <ReceiptPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/obras/:jobId/etapas/:stageId/pagar"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <ProfessionalLedgerPage />
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
              <Route path="financeiro" element={<FinanceAdminPage />} />
              <Route path="contestacoes" element={<DisputesAdminPage />} />
              <Route path="anuncios" element={<AdsAdminPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
