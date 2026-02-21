'use client';

import { CharacterProvider, useCharacter } from '@/lib/character/CharacterContext';
import { AdventureLogProvider } from '@/lib/adventure-log/AdventureLogContext';
import { Layout } from '@/components/Layout';
import { CharacterCreation } from '@/components/CharacterCreation';

function GameContent() {
  const { character } = useCharacter();

  if (!character) {
    return <CharacterCreation />;
  }

  return <Layout />;
}

export default function Home() {
  return (
    <CharacterProvider>
      <AdventureLogProvider>
        <GameContent />
      </AdventureLogProvider>
    </CharacterProvider>
  );
}
