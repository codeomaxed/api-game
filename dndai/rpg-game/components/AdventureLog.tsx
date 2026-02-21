'use client';

import React, { useEffect, useRef } from 'react';

export type LogEntryType = 'danger' | 'loot' | 'info';

export interface LogEntry {
  text: string;
  type: LogEntryType;
}

interface AdventureLogProps {
  entries: LogEntry[];
}

export function AdventureLog({ entries }: AdventureLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="adventure-log-container flex-grow border-t border-[var(--border)] pt-4 flex flex-col min-h-0">
      <h3 className="log-header font-cinzel text-[0.9rem] mb-3" style={{ color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0, textAlign: 'center' }}>
        Adventure Log
      </h3>
      <div 
        ref={logRef}
        className="log-entries flex flex-col gap-2 font-mono text-[0.8rem] overflow-y-auto pr-1"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {entries.length === 0 ? (
          <div className="log-entry entry-info">
            <span>Your adventure begins...</span>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div key={index} className={`log-entry entry-${entry.type}`}>
              <span>{entry.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}












