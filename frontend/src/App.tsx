import { Routes, Route, Navigate } from 'react-router-dom';
import { BusinessProvider, useBusinessContext } from './context/BusinessContext';
import Layout from './components/Layout';
import BusinessSelector from './pages/BusinessSelector';
import DecisionSandbox from './pages/DecisionSandbox';
import ActionExecution from './pages/ActionExecution';
import DocumentIntelligence from './pages/DocumentIntelligence';
import ObligationsLedger from './pages/ObligationsLedger';
import CashFlowForecast from './pages/CashFlowForecast';

/** Redirect to selector if no business is chosen yet. */
function RequireBusiness({ children }: { children: React.ReactNode }) {
    const { selectedBusiness } = useBusinessContext();
    if (!selectedBusiness) return <Navigate to="/select-business" replace />;
    return <>{children}</>;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/select-business" element={<BusinessSelector />} />
            <Route path="/*" element={
                <RequireBusiness>
                    <Layout>
                        <Routes>
                            <Route path="/" element={<Navigate to="/document-ai" replace />} />
                            <Route path="/sandbox" element={<DecisionSandbox />} />
                            <Route path="/execution" element={<ActionExecution />} />
                            <Route path="/document-ai" element={<DocumentIntelligence />} />
                            <Route path="/obligations-ledger" element={<ObligationsLedger />} />
                            <Route path="/forecast" element={<CashFlowForecast />} />
                        </Routes>
                    </Layout>
                </RequireBusiness>
            } />
        </Routes>
    );
}

function App() {
    return (
        <BusinessProvider>
            <AppRoutes />
        </BusinessProvider>
    );
}

export default App;
