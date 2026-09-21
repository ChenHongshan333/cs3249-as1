import { Dialog, RadioGroup } from 'radix-ui';
import { X } from 'lucide-react';
import { useAuiState } from '@assistant-ui/react';
import { Button } from './Button';
import { questions, type Scenario } from '../mock/fixtures';
import type { usePreconsultation } from '../usePreconsultation';
import './SimulationControls.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: Scenario;
  onScenarioChange: (scenario: Scenario) => void;
  session: ReturnType<typeof usePreconsultation>;
};

export default function SimulationControls({
  open,
  onOpenChange,
  scenario,
  onScenarioChange,
  session,
}: Props) {
  const busy = useAuiState((s) => s.thread.isRunning);
  const { state, service } = session;
  const submittedAnswers = state.request?.answers ?? state.answers;

  function loadScenario(next: Scenario) {
    onScenarioChange(next);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="simulation-overlay" />
        <Dialog.Content
          className="simulation-panel"
          onCloseAutoFocus={(event) => {
            // The header trigger sits outside this lazily loaded dialog.
            event.preventDefault();
            document.getElementById('simulation-trigger')?.focus();
          }}
        >
          <div className="simulation-heading">
            <Dialog.Title>Simulation</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" aria-label="Close simulation">
                <X size={20} aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="simulation-hint">
            Local simulation only. No data is sent to UHC.
          </Dialog.Description>

          <section className="simulation-section">
            <h3>Scenario</h3>
            <div className="simulation-options">
              <Button
                variant={scenario === 'normal' ? 'primary' : 'secondary'}
                aria-pressed={scenario === 'normal'}
                onClick={() => loadScenario('normal')}
              >
                Normal
              </Button>
              <Button
                variant={scenario === 'risk' ? 'primary' : 'secondary'}
                aria-pressed={scenario === 'risk'}
                onClick={() => loadScenario('risk')}
              >
                Risk
              </Button>
            </div>
            <p className="simulation-hint">Selecting a scenario starts a new session.</p>
          </section>

          <section className="simulation-section">
            <h3>Notification result</h3>
            <RadioGroup.Root
              className="simulation-options"
              aria-label="Notification result"
              value={state.outcome}
              disabled={busy}
              onValueChange={(value) => service.setOutcome(value as 'delivered' | 'failed')}
            >
              <RadioGroup.Item value="delivered" className="simulation-outcome">
                Delivered
              </RadioGroup.Item>
              <RadioGroup.Item value="failed" className="simulation-outcome">
                Failed
              </RadioGroup.Item>
            </RadioGroup.Root>
            <Button
              className="simulation-staff"
              variant="secondary"
              disabled={busy || state.request?.status !== 'delivered'}
              onClick={() => service.connectStaff()}
            >
              Simulate staff joining
            </Button>
          </section>

          <details className="simulation-section simulation-data">
            <summary>Submitted data</summary>
            <dl className="simulation-metadata">
              <dt>Stage</dt>
              <dd>{state.stage}</dd>
              {state.request && (
                <>
                  <dt>Request</dt>
                  <dd>{state.request.id}</dd>
                  <dt>Status</dt>
                  <dd>{state.request.status}</dd>
                  <dt>Origin</dt>
                  <dd>{state.request.origin}</dd>
                </>
              )}
              {state.completion && (
                <>
                  <dt>Completion</dt>
                  <dd>{state.completion.id}</dd>
                </>
              )}
            </dl>
            <h3>{state.request ? 'Request answers' : 'Answers'}</h3>
            {submittedAnswers.length === 0 && (
              <p className="simulation-hint">No submitted answers yet.</p>
            )}
            <ul className="simulation-answers">
              {submittedAnswers.map((answer) => (
                <li key={answer.questionId}>
                  <strong>
                    {questions[answer.questionId].title} · {answer.status}
                  </strong>
                  <span>{answer.status === 'skipped' ? 'Not answered' : answer.value}</span>
                </li>
              ))}
            </ul>
          </details>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
