import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout/Layout'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Goals from './pages/Goals'
import Papers from './pages/Papers'
import Growth from './pages/Growth'
import Notes from './pages/Notes'
import Meetings from './pages/Meetings'
import Projects from './pages/Projects'
import Experiments from './pages/Experiments'
import Advisor from './pages/Advisor'
import Journal from './pages/Journal'
import Health from './pages/Health'
import English from './pages/English'
import Diary from './pages/Diary'
import Finance from './pages/Finance'
import Inspiration from './pages/Inspiration'
import Files from './pages/Files'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/calendar" element={<Calendar />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/papers" element={<Papers />} />
        <Route path="/growth" element={<Growth />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/experiments" element={<Experiments />} />
        <Route path="/advisor" element={<Advisor />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/health" element={<Health />} />
        <Route path="/english" element={<English />} />
        <Route path="/diary" element={<Diary />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/inspiration" element={<Inspiration />} />
        <Route path="/files" element={<Files />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
