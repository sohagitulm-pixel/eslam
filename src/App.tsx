/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { AppProvider, useApp } from './context/AppContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdvancedBuilderPage } from './pages/AdvancedBuilderPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExperienceViewerPage } from './pages/ExperienceViewerPage';
import { HomePage } from './pages/HomePage';
import { QuickCreatorPage } from './pages/QuickCreatorPage';
import { TemplatesPage } from './pages/TemplatesPage';

function AppShell() {
  const { route } = useApp();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {route.name === 'home' && <HomePage />}
        {route.name === 'templates' && <TemplatesPage />}
        {route.name === 'create' && <QuickCreatorPage initialTemplateId={route.templateId} />}
        {route.name === 'builder' && <AdvancedBuilderPage experienceId={route.experienceId} />}
        {route.name === 'experience' && <ExperienceViewerPage experienceId={route.experienceId} />}
        {route.name === 'dashboard' && <DashboardPage />}
        {route.name === 'admin' && <AdminDashboardPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  );
}
