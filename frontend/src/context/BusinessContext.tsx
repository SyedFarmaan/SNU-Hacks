import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Business } from '../services/businessApi';

interface BusinessContextType {
    selectedBusiness: Business | null;
    setSelectedBusiness: (b: Business | null) => void;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

    return (
        <BusinessContext.Provider value={{ selectedBusiness, setSelectedBusiness }}>
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusinessContext(): BusinessContextType {
    const ctx = useContext(BusinessContext);
    if (!ctx) throw new Error('useBusinessContext must be used inside BusinessProvider');
    return ctx;
}
