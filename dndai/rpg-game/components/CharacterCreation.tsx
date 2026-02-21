'use client';

import React, { useState } from 'react';
import { useCharacter } from '@/lib/character/CharacterContext';
import { createDefaultCharacter, DEFAULT_JOBS } from '@/lib/character/defaultCharacter';
import { JobName } from '@/types/character';

export function CharacterCreation() {
  const { setCharacter } = useCharacter();
  const [name, setName] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobName>('Warrior');
  const [isCreating, setIsCreating] = useState(false);
  const [preRenderAllRooms, setPreRenderAllRooms] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preRenderAllRooms');
      return saved !== null ? saved === 'true' : false; // Default to false
    }
    return false;
  });
  
  // Save to localStorage when toggle changes
  const handleToggleChange = (value: boolean) => {
    setPreRenderAllRooms(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preRenderAllRooms', value.toString());
    }
  };

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Please enter a character name');
      return;
    }

    setIsCreating(true);
    const character = createDefaultCharacter(name.trim(), selectedJob);
    setCharacter(character);
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-8">
      <div className="max-w-2xl w-full bg-dark-panel border-2 border-glow rounded-lg p-8">
        <h1 className="text-3xl font-cinzel text-crimson mb-6 text-center">
          Create Your Character
        </h1>

        <div className="space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-cinzel text-rose mb-2">
              Character Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your character's name"
              className="w-full px-4 py-2 bg-dark-bg border border-rose/30 rounded text-dark-text focus:outline-none focus:border-glow"
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* Job Selection */}
          <div>
            <label className="block text-sm font-cinzel text-rose mb-2">
              Job
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.keys(DEFAULT_JOBS).map((jobName) => {
                const job = DEFAULT_JOBS[jobName];
                return (
                  <button
                    key={jobName}
                    onClick={() => setSelectedJob(jobName as JobName)}
                    className={`
                      p-4 border-2 rounded text-left transition-all
                      ${
                        selectedJob === jobName
                          ? 'border-glow bg-dark-bg shadow-lg shadow-glow/20'
                          : 'border-dark-muted/30 bg-dark-panel/50 hover:border-rose'
                      }
                    `}
                  >
                    <div className="font-cinzel text-crimson mb-1">{job.name}</div>
                    <div className="text-xs text-dark-muted">
                      {job.description}
                    </div>
                    <div className="text-xs text-dark-muted mt-1">
                      Primary: {job.primaryStat}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pre-render Toggle */}
          <div className="flex items-center justify-between p-4 rounded border" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <label htmlFor="preRenderToggle" className="text-sm cursor-pointer flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <span className="font-cinzel" style={{ color: 'var(--gold)' }}>Pre-render all rooms</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(Slower loading, instant gameplay)</span>
            </label>
            <button
              id="preRenderToggle"
              type="button"
              onClick={() => handleToggleChange(!preRenderAllRooms)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer"
              style={{ background: preRenderAllRooms ? 'var(--accent)' : 'rgba(102,102,102,0.5)' }}
              aria-label="Toggle pre-render all rooms"
            >
              <span
                className="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
                style={{ transform: preRenderAllRooms ? 'translateX(1.25rem)' : 'translateX(0.25rem)' }}
              />
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className={`
              w-full py-3 px-6 rounded font-cinzel text-lg
              transition-all
              ${
                name.trim() && !isCreating
                  ? 'bg-crimson hover:bg-glow text-white border-2 border-glow'
                  : 'bg-dark-muted/30 text-dark-muted cursor-not-allowed'
              }
            `}
          >
            {isCreating ? 'Creating...' : 'Enter Dungeon'}
          </button>
        </div>
      </div>
    </div>
  );
}














