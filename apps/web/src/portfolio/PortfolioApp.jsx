import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext.jsx';
import { TenantProvider } from '@/contexts/TenantContext.jsx';
import { Toaster } from '@/components/ui/sonner.jsx';
import { Toaster as FormToaster } from '@/components/ui/toaster.jsx';
import PortfolioGuide from './PortfolioGuide.jsx';

const pages = {
  '/omnichannel': lazy(() => import('@/pages/OmnichannelPage.jsx')),
  '/agenda': lazy(() => import('@/pages/AgendaPage.jsx')),
  '/modo-recepcao': lazy(() => import('@/pages/ReceptionModePage.jsx')),
  '/pacientes': lazy(() => import('@/pages/PacientesPage.jsx')),
  '/prontuario': lazy(() => import('@/pages/ClinicalRecordPage.jsx')),
  '/financeiro': lazy(() => import('@/pages/FinanceiroPage.jsx')),
  '/estoque': lazy(() => import('@/pages/InventoryPage.jsx')),
  '/evidence': PortfolioGuide,
};

function Workspace() {
  const { user, login, currentTenantId } = useAuth();
  useEffect(() => {
    if (!user) login('reviewer@example.invalid', '');
  }, [user, login]);

  if (!user) return <main className="p-8">Opening the fictional clinic…</main>;
  return (
    <TenantProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <FormToaster />
        <Suspense fallback={<main className="p-8">Opening the module…</main>}>
          <Routes>
            <Route path="/" element={<Navigate to="/omnichannel" replace />} />
            {Object.entries(pages).map(([path, Page]) => <Route key={path} path={path} element={currentTenantId === 'tenant_harbor' && !['/omnichannel', '/pacientes', '/evidence'].includes(path) ? <Navigate to="/pacientes" replace /> : <Page />} />)}
            <Route path="*" element={<Navigate to="/evidence" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TenantProvider>
  );
}

export default function PortfolioApp() {
  return <AuthProvider><Workspace /></AuthProvider>;
}
