import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { Dashboard } from './pages/Dashboard'
import { SermonPlanning } from './pages/SermonPlanning'
import { SeriesManagement } from './pages/SeriesManagement'
import { SermonEditor } from './pages/SermonEditor'
import { ExportCenter } from './pages/ExportCenter'
import { Analytics } from './pages/Analytics'
import { ThemeProvider } from './components/theme-provider'
import './index.css'
import Login from './pages/Login'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthed = typeof window !== 'undefined' && !!localStorage.getItem('authToken')
  return isAuthed ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ccf-theme">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/planning" element={<SermonPlanning />} />
                    <Route path="/series" element={<SeriesManagement />} />
                    <Route path="/sermons/:id" element={<SermonEditor />} />
                    <Route path="/export" element={<ExportCenter />} />
                    <Route path="/analytics" element={<Analytics />} />
                  </Routes>
                </DashboardLayout>
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
