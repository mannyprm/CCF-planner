import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { Dashboard } from './pages/Dashboard'
import { SermonPlanning } from './pages/SermonPlanning'
import { SeriesManagement } from './pages/SeriesManagement'
import { SermonEditor } from './pages/SermonEditor'
import { ExportCenter } from './pages/ExportCenter'
import { Analytics } from './pages/Analytics'
import { ThemeProvider } from './components/theme-provider'
import './index.css'

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ccf-theme">
      <Router>
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
      </Router>
    </ThemeProvider>
  )
}

export default App