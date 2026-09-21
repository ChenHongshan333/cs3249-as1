import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocalRuntime, type ChatModelAdapter } from '@assistant-ui/react';
import { createMockService, type DemoAction, type Stage } from './mock/service';
import { questionOrder, questions, welcomeMessage, type QuestionId, type Scenario } from './mock/fixtures';

function isQuestion(stage: string): stage is QuestionId {
  return questionOrder.some((id) => id === stage);
}

function getPlaceholder(stage: Stage, inputEnabled: boolean, finished: boolean) {
  if (isQuestion(stage)) {
    return inputEnabled ? questions[stage].placeholder : 'Choose an option above, or select Use my own words.';
  }
  if (stage === 'welcome') return 'Start the pre-consultation above.';
  if (stage === 'review') return 'Review your submitted answers above.';
  if (stage === 'completed') return 'This pre-consultation is complete.';
  return finished ? 'The simulated staff handover is complete.' : 'Questions are paused during the support request.';
}

// assistant-ui owns messages and the active composer. Only unsubmitted drafts live here.
export function usePreconsultation(scenario: Scenario) {
  const [service] = useState(() => createMockService(scenario));
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot);
  const [selectedAnswer, selectAnswer] = useState('');
  const [answerMode, setAnswerMode] = useState<'choice' | 'text'>('choice');
  const [draftNotice, setDraftNotice] = useState('');
  const drafts = useRef<Partial<Record<QuestionId, string>>>({});

  const adapter = useMemo<ChatModelAdapter>(() => ({
    async run({ messages, runConfig, abortSignal }) {
      const message = messages.at(-1)!;
      let action = message.metadata.custom.action as DemoAction | undefined;
      if (!action) {
        const questionId = runConfig.custom?.questionId;
        if (typeof questionId !== 'string' || !isQuestion(questionId)) {
          throw new Error('A submitted answer must identify its question.');
        }
        const value = message.content.filter((part) => part.type === 'text')
          .map((part) => part.text).join('\n');
        action = { type: 'answer', questionId, value };
      }
      const reply = await service.respond(action, abortSignal);
      return { content: [{ type: 'text', text: reply }] };
    },
  }), [service]);

  const runtime = useLocalRuntime(adapter, {
    initialMessages: [{ role: 'assistant', content: [{ type: 'text', text: welcomeMessage }] }],
  });

  // Restart disposes the service; unmount also cancels an in-flight runtime run.
  useEffect(() => () => runtime.thread.cancelRun(), [runtime]);
  const finished = state.stage === 'completed' || state.request?.status === 'connected';
  useEffect(() => {
    if (!finished) return;
    drafts.current = {};
    runtime.thread.composer.setText('');
    setDraftNotice('');
  }, [finished, runtime]);

  const inputEnabled = isQuestion(state.stage) && (state.stage !== 'wellbeing' || answerMode === 'text');
  const placeholder = getPlaceholder(state.stage, inputEnabled, finished);

  function saveDraft() {
    const questionId = service.getSnapshot().stage;
    const text = runtime.thread.composer.getState().text;
    if (isQuestion(questionId) && text.trim()) {
      drafts.current[questionId] = text;
    } else if (isQuestion(questionId) && inputEnabled) {
      delete drafts.current[questionId];
    }
    setDraftNotice(Object.keys(drafts.current).length
      ? 'Unsent text is kept only as a draft in this local session. It is not part of your submitted record.' : '');
    runtime.thread.composer.setText('');
  }

  function sendAction(label: string, action: DemoAction) {
    if (runtime.thread.getState().isRunning) return;
    saveDraft();
    runtime.thread.append({
      role: 'user', content: [{ type: 'text', text: label }],
      metadata: { custom: { action, isAction: action.type !== 'answer' } },
    });
  }

  // Both Enter and the library Send button bind the question before the library sends.
  function prepareTextSubmission() {
    const questionId = service.getSnapshot().stage;
    if (!inputEnabled || !isQuestion(questionId) || runtime.thread.getState().isRunning
      || !runtime.thread.composer.getState().text.trim()) return false;
    runtime.thread.composer.setRunConfig({ custom: { questionId } });
    delete drafts.current[questionId];
    setDraftNotice('');
    return true;
  }

  function changeAnswerMode(mode: 'choice' | 'text') {
    if (runtime.thread.getState().isRunning || mode === answerMode) return;
    if (mode === 'choice') saveDraft();
    else {
      runtime.thread.composer.setText(drafts.current.wellbeing ?? '');
      setDraftNotice('');
    }
    setAnswerMode(mode);
  }

  function submitWellbeing(answer: string) {
    if (answerMode !== 'choice') return;
    sendAction(answer, { type: 'answer', questionId: 'wellbeing', value: answer });
  }

  function skipQuestion() {
    const questionId = service.getSnapshot().stage;
    if (!isQuestion(questionId)) return;
    sendAction('Skipped: ' + questions[questionId].title, { type: 'skip', questionId });
  }

  function dispose() {
    service.dispose();
    runtime.thread.cancelRun();
    drafts.current = {};
  }

  return {
    runtime, state, service, selectedAnswer, selectAnswer, answerMode, changeAnswerMode,
    draftNotice, inputEnabled, placeholder, prepareTextSubmission, submitWellbeing, skipQuestion, dispose,
    start: () => sendAction('Pre-consultation started', { type: 'start' }),
    complete: () => sendAction('Submitted answers confirmed', { type: 'complete' }),
    retryHandover: () => sendAction('Retrying the simulated support request', { type: 'retry-handover' }),
  };
}
