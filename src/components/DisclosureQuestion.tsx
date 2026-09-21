import { Info } from 'lucide-react';
import { Button } from './Button';

export function DisclosureQuestion({ onSkip, disabled }: { onSkip: () => void; disabled: boolean }) {
  return (
    <section className="disclosure-question" aria-label="Your choice to share">
      <p className="disclosure-notice">
        <Info size={20} aria-hidden="true" />
        <span>You choose what to share. You can skip any question, without giving a reason.</span>
      </p>
      <div className="disclosure-actions">
        <Button variant="secondary" onClick={onSkip} disabled={disabled}>Skip this question</Button>
      </div>
    </section>
  );
}
