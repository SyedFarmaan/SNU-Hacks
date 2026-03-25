import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DecisionSandbox from './pages/DecisionSandbox';
import ActionExecution from './pages/ActionExecution';
import DocumentIntelligence from './pages/DocumentIntelligence';
import ObligationsLedger from './pages/ObligationsLedger';
import CashFlowForecast from './pages/CashFlowForecast';

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Navigate to="/sandbox" replace />} />
                <Route path="/sandbox" element={<DecisionSandbox />} />
                <Route path="/execution" element={<ActionExecution />} />
                <Route path="/document-ai" element={<DocumentIntelligence />} />
                <Route path="/obligations-ledger" element={<ObligationsLedger />} />
                <Route path="/forecast" element={<CashFlowForecast />} />
            </Routes>
        </Layout>
    )
}

export default App
