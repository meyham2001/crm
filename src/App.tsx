import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Organizations } from './pages/Organizations'
import { OrganizationDetail } from './pages/OrganizationDetail'
import { Contacts } from './pages/Contacts'
import { ContactDetail } from './pages/ContactDetail'
import { Deals } from './pages/Deals'
import { DealDetail } from './pages/DealDetail'
import { Pipeline } from './pages/Pipeline'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="organizations/new" element={<OrganizationDetail />} />
          <Route path="organizations/:id" element={<OrganizationDetail />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="contacts/new" element={<ContactDetail />} />
          <Route path="contacts/:id" element={<ContactDetail />} />
          <Route path="deals" element={<Deals />} />
          <Route path="deals/new" element={<DealDetail />} />
          <Route path="deals/:id" element={<DealDetail />} />
          <Route path="pipeline" element={<Pipeline />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App