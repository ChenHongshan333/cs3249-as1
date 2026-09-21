import { Orbit, SlidersHorizontal } from 'lucide-react';
import { Button } from './Button';

export function Header({ onOpenSimulation }: { onOpenSimulation: () => void }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark"><Orbit aria-hidden="true" /></span>
        <span className="brand-name">Lumen</span>
      </div>
      <div className="header-actions">
        <span className="assistant-badge">AI Assistant</span>
        {import.meta.env.DEV && (
          <Button id="simulation-trigger" variant="ghost" className="simulation-button"
            aria-haspopup="dialog" onClick={onOpenSimulation}>
            <SlidersHorizontal size={18} aria-hidden="true" /><span>Simulation</span>
          </Button>
        )}
      </div>
    </header>
  );
}
