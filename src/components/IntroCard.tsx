import { ArrowRight } from 'lucide-react';
import { Button } from './Button';

export function IntroCard({ onStart, disabled }: { onStart: () => void; disabled: boolean }) {
  return (
    <section className="intro-card" aria-label="About this pre-consultation">
      <h2 className="question-heading">Before your appointment</h2>
      <p className="question-caption">A few questions to help prepare for your counselling appointment. Share only what you feel comfortable sharing. You can skip any question.</p>
      <Button onClick={onStart} disabled={disabled}>Start pre-consultation<ArrowRight size={17} aria-hidden="true" /></Button>
    </section>
  );
}
