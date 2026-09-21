import { questionOrder, questions, type QuestionId, type Scenario } from './fixtures.ts';

export type Stage = 'welcome' | QuestionId | 'review' | 'completed' | 'handover';
export type HandoverStatus = 'sending' | 'delivered' | 'failed' | 'connected';

export type AnswerRecord = {
  readonly questionId: QuestionId;
  readonly status: 'answered' | 'skipped';
  readonly value?: string;
};

export type HandoverRequest = {
  readonly id: string;
  readonly origin: 'risk-scenario';
  readonly status: HandoverStatus;
  readonly answers: readonly AnswerRecord[];
};

export type MockSnapshot = {
  readonly stage: Stage;
  readonly answers: readonly AnswerRecord[];
  readonly request: HandoverRequest | null;
  readonly completion: { readonly id: string } | null;
  readonly outcome: 'delivered' | 'failed';
};

export type DemoAction =
  | { type: 'start' }
  | { type: 'answer'; questionId: QuestionId; value: string }
  | { type: 'skip'; questionId: QuestionId }
  | { type: 'complete' }
  | { type: 'retry-handover' };

const completionReply = 'Your pre-consultation is complete in this teaching prototype. The record below contains only the answers you submitted. No information was sent to UHC.';

function handoverReply(status: HandoverStatus): string {
  if (status === 'connected') return 'A simulated staff member has now taken over. This ends the automated pre-consultation demo; no real staff member is connected.';
  if (status === 'failed') return 'The simulated support request could not be delivered. Your submitted answers are still here. You can retry the request.';
  if (status === 'delivered') return 'The simulated support request has been delivered. We are waiting for a staff member to take over. No real notification was sent.';
  return 'The usual questions are paused while the simulated support request is being sent.';
}

// Fixed three-question flow. This service receives submitted actions, never drafts or chat state.
export function createMockService(scenario: Scenario, delayMs = 650) {
  let snapshot: MockSnapshot = {
    stage: 'welcome', answers: [], request: null, completion: null, outcome: 'delivered',
  };
  let disposed = false;
  let activeOperation: AbortController | null = null;
  const listeners = new Set<() => void>();

  function update(change: Partial<MockSnapshot>) {
    snapshot = { ...snapshot, ...change };
    listeners.forEach((listener) => listener());
  }

  function validate(action: DemoAction) {
    switch (action.type) {
      case 'start':
        if (snapshot.stage !== 'welcome') throw new Error('The pre-consultation has already started.');
        return;
      case 'answer':
      case 'skip':
        if (!questionOrder.includes(action.questionId) || snapshot.stage !== action.questionId) {
          throw new Error('This action does not belong to the current question.');
        }
        if (action.type === 'answer' && (typeof action.value !== 'string' || !action.value.trim())) {
          throw new Error('Enter a response before sending.');
        }
        return;
      case 'complete':
        if (snapshot.stage !== 'review' && snapshot.stage !== 'completed') {
          throw new Error('Review all three question records before finishing.');
        }
        return;
      case 'retry-handover':
        if (snapshot.stage !== 'handover' || !snapshot.request || snapshot.request.status === 'sending') {
          throw new Error('There is no failed request to retry.');
        }
        return;
      default:
        throw new Error('Unknown pre-consultation action.');
    }
  }

  async function respond(submittedAction: DemoAction, abortSignal: AbortSignal): Promise<string> {
    abortSignal.throwIfAborted();
    if (disposed) throw new DOMException('This demo session has ended.', 'AbortError');
    if (activeOperation) {
      const error = new Error('A response is already in progress.');
      error.name = 'BusyError';
      throw error;
    }

    // Capture the submitted question and value before waiting; later input cannot change this action.
    const action = { ...submittedAction };
    validate(action);
    if (action.type === 'complete' && snapshot.completion) return completionReply;
    if (action.type === 'retry-handover' && snapshot.request?.status !== 'failed') {
      return handoverReply(snapshot.request!.status);
    }

    const controller = new AbortController();
    activeOperation = controller;
    const cancel = () => controller.abort(abortSignal.reason);
    abortSignal.addEventListener('abort', cancel, { once: true });
    if (abortSignal.aborted) cancel();

    function checkActive() {
      controller.signal.throwIfAborted();
      if (disposed) throw new DOMException('This demo session has ended.', 'AbortError');
    }

    async function deliver(request: HandoverRequest) {
      const outcome = snapshot.outcome;
      try {
        await wait(delayMs, controller.signal);
        checkActive();
        if (snapshot.stage !== 'handover' || snapshot.request?.id !== request.id || snapshot.request.status !== 'sending') {
          throw new Error('The active support request changed before delivery.');
        }
        update({ request: { ...request, status: outcome } });
        return handoverReply(outcome);
      } catch (error) {
        // Keep submitted answers after cancellation; a disposed session never publishes another update.
        if (!disposed && snapshot.request?.id === request.id && snapshot.request.status === 'sending') {
          update({ request: { ...request, status: 'failed' } });
        }
        throw error;
      }
    }

    try {
      checkActive();
      if (action.type === 'retry-handover') {
        const request = { ...snapshot.request!, status: 'sending' as const };
        update({ request });
        return await deliver(request);
      }

      if (action.type === 'answer' && action.questionId === 'concerns' && scenario === 'risk') {
        const answers = [...snapshot.answers, {
          questionId: action.questionId, status: 'answered' as const, value: action.value.trim(),
        }];
        // The risk preset saves this answer and starts a request without analysing its text.
        const request: HandoverRequest = {
          id: 'demo-handover-1', origin: 'risk-scenario', status: 'sending', answers,
        };
        update({ stage: 'handover', answers, request });
        return await deliver(request);
      }

      await wait(delayMs, controller.signal);
      checkActive();
      validate(action);

      if (action.type === 'start') {
        update({ stage: 'wellbeing' });
        return questions.wellbeing.prompt;
      }
      if (action.type === 'complete') {
        update({ stage: 'completed', completion: { id: 'demo-completion-1' } });
        return completionReply;
      }

      const answer: AnswerRecord = action.type === 'skip'
        ? { questionId: action.questionId, status: 'skipped' }
        : { questionId: action.questionId, status: 'answered', value: action.value.trim() };
      const nextQuestion = questionOrder[questionOrder.indexOf(action.questionId) + 1];
      update({ answers: [...snapshot.answers, answer], stage: nextQuestion ?? 'review' });
      const acknowledgement = action.type === 'skip' ? "That's okay. You can leave that question unanswered." : 'Thank you for sharing.';
      return nextQuestion
        ? acknowledgement + ' ' + questions[nextQuestion].prompt
        : acknowledgement + ' Please review the answers you submitted before finishing.';
    } finally {
      abortSignal.removeEventListener('abort', cancel);
      if (activeOperation === controller) activeOperation = null;
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    respond,
    setOutcome(outcome: 'delivered' | 'failed') {
      if (disposed) return;
      if (outcome !== 'delivered' && outcome !== 'failed') throw new Error('Unknown simulated request outcome.');
      if (snapshot.request?.status === 'sending') throw new Error('Wait for the current request before changing the next outcome.');
      if (snapshot.outcome !== outcome) update({ outcome });
    },
    connectStaff() {
      if (disposed || snapshot.request?.status === 'connected') return;
      if (snapshot.stage !== 'handover' || snapshot.request?.status !== 'delivered') {
        throw new Error('A simulated staff member can only join a delivered request.');
      }
      update({ request: { ...snapshot.request, status: 'connected' } });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      activeOperation?.abort(new DOMException('This demo session has ended.', 'AbortError'));
    },
  };
}

export type MockService = ReturnType<typeof createMockService>;

function wait(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, delayMs);
    function cancel() {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reject(signal.reason ?? new DOMException('Request cancelled.', 'AbortError'));
    }
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
}
