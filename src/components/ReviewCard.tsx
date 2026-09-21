import { Check } from 'lucide-react';
import { Button } from './Button';
import { questions, questionOrder } from '../mock/fixtures';
import type { AnswerRecord } from '../mock/service';

type Props = {
  answers: readonly AnswerRecord[];
  completed: boolean;
  onComplete: () => void;
  disabled: boolean;
};

export function ReviewCard({ answers, completed, onComplete, disabled }: Props) {
  return (
    <section className="review-card" aria-label={completed ? 'Completed pre-consultation' : 'Review your responses'}>
      <div role="status">
        <h2 className="question-heading">{completed ? 'Pre-consultation complete' : 'Review your responses'}</h2>
        <p className="question-caption">{completed
          ? 'This teaching pre-consultation is complete. Your submitted responses remain below.'
          : 'These are the responses you submitted. Skipped questions are marked as unanswered.'}</p>
      </div>
      <ol className="review-answers">
        {questionOrder.map((questionId) => {
          const answer = answers.find((record) => record.questionId === questionId);
          return (
            <li key={questionId}>
              <h3>{questions[questionId].prompt}</h3>
              <p className={answer?.status === 'answered' ? 'review-answer' : 'review-unanswered'}>
                {!answer ? 'Not submitted' : answer.status === 'skipped' ? 'Skipped — not answered' : answer.value}
              </p>
            </li>
          );
        })}
      </ol>
      {!completed && (
        <div className="review-actions">
          <Button onClick={onComplete} disabled={disabled}>Confirm and finish<Check size={17} aria-hidden="true" /></Button>
        </div>
      )}
    </section>
  );
}
