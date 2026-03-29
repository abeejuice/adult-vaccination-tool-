import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import VaccineDetail from './pages/VaccineDetail'
import Schedule from './pages/Schedule'
import Chat from './pages/Chat'
import CommandPalette from './components/CommandPalette'

export default function App() {
  return (
    <>
      <CommandPalette />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vaccine/:id" element={<VaccineDetail />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </>
  )
}
