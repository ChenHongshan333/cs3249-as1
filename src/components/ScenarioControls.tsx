import { useAuiState } from '@assistant-ui/react';
import { IntroCard } from './IntroCard';
import { WellbeingQuestion } from './WellbeingQuestion';
import { DisclosureQuestion } from './DisclosureQuestion';
import { ReviewCard } from './ReviewCard';
import { HandoverCard } from './HandoverCard';
import { wellbeingOptions } from '../mock/fixtures';
import type { usePreconsultation } from '../usePreconsultation';

export function ScenarioControls({ session }: { session: ReturnType<typeof usePreconsultation> }) {
  const busy = useAuiState((s) => s.thread.isRunning);
  const { state } = session;

  switch (state.stage) {
    case 'welcome':
      return <IntroCard onStart={session.start} disabled={busy} />;
    case 'wellbeing': {
      const answer = wellbeingOptions.find((option) => option.id === session.selectedAnswer);
      return <WellbeingQuestion options={wellbeingOptions} value={session.selectedAnswer}
        mode={session.answerMode} onModeChange={session.changeAnswerMode} onSelect={session.selectAnswer}
        onSubmit={() => answer && session.submitWellbeing(answer.label)} onSkip={session.skipQuestion} disabled={busy} />;
    }
    case 'concerns':
    case 'impact':
      return <DisclosureQuestion onSkip={session.skipQuestion} disabled={busy} />;
    case 'review':
    case 'completed':
      return <ReviewCard answers={state.answers} completed={state.stage === 'completed'}
        onComplete={session.complete} disabled={busy} />;
    case 'handover':
      return state.request && <HandoverCard status={state.request.status} onRetry={session.retryHandover} disabled={busy} />;
  }
}
