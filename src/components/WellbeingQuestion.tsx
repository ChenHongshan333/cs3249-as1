import { RadioGroup, Tabs } from 'radix-ui';
import { ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { questions } from '../mock/fixtures';
import './WellbeingQuestion.css';

type Props = {
  options: readonly { id: string; label: string; description: string }[];
  value: string;
  onSelect: (value: string) => void;
  onSubmit: () => void;
  mode: 'choice' | 'text';
  onModeChange: (mode: 'choice' | 'text') => void;
  onSkip: () => void;
  disabled: boolean;
};

export function WellbeingQuestion({ options, value, onSelect, onSubmit, mode, onModeChange, onSkip, disabled }: Props) {
  return (
    <section className="wellbeing-question" aria-label="Current wellbeing">
      <h2 className="question-heading">{questions.wellbeing.prompt}</h2>
      <p className="question-caption">Choose what feels closest, use your own words, or skip this question.</p>
      <Tabs.Root value={mode} onValueChange={(nextMode) => onModeChange(nextMode === 'text' ? 'text' : 'choice')}>
        <Tabs.List className="answer-modes" aria-label="Answer format">
          <Tabs.Trigger className="answer-mode" value="choice" disabled={disabled}>Choose an option</Tabs.Trigger>
          <Tabs.Trigger className="answer-mode" value="text" disabled={disabled}>Use my own words</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="choice">
          <RadioGroup.Root className="wellbeing-options" value={value} onValueChange={onSelect}
            disabled={disabled} aria-label="How things feel today">
            {options.map((option) => (
              <RadioGroup.Item key={option.id} value={option.id} className="wellbeing-option">
                <span className="option-radio"><RadioGroup.Indicator /></span>
                <span><span className="option-label">{option.label}</span>
                  <span className="option-description">{option.description}</span></span>
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </Tabs.Content>
        <Tabs.Content value="text">
          <p className="wellbeing-text-hint">Write your answer in the message box below, then send it when you are ready.</p>
        </Tabs.Content>
      </Tabs.Root>
      <div className="wellbeing-actions">
        {mode === 'choice' && (
          <Button disabled={!value || disabled} onClick={onSubmit}>
            Continue<ArrowRight size={17} aria-hidden="true" />
          </Button>
        )}
        <Button variant="secondary" onClick={onSkip} disabled={disabled}>Skip this question</Button>
      </div>
    </section>
  );
}
