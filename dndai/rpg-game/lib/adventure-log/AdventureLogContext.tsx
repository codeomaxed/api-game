'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LogEntry, LogEntryType } from '@/components/AdventureLog';

interface AdventureLogContextType {
  entries: LogEntry[];
  addEntry: (text: string, type?: LogEntryType) => void;
  clearEntries: () => void;
}

const AdventureLogContext = createContext<AdventureLogContextType | undefined>(undefined);

export function AdventureLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const addEntry = useCallback((text: string, type: LogEntryType = 'info') => {
    setEntries(prev => [...prev, { text, type }]);
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  return (
    <AdventureLogContext.Provider value={{ entries, addEntry, clearEntries }}>
      {children}
    </AdventureLogContext.Provider>
  );
}

export function useAdventureLog() {
  const context = useContext(AdventureLogContext);
  if (context === undefined) {
    throw new Error('useAdventureLog must be used within an AdventureLogProvider');
  }
  return context;
}












