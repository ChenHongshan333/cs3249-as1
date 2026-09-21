import assert from 'node:assert/strict';
import test from 'node:test';
import { createMockService, type DemoAction, type MockService } from '../src/mock/service.ts';
import { questionOrder, type QuestionId } from '../src/mock/fixtures.ts';

const riskExample = 'I am worried I might hurt myself.';
const signal = () => new AbortController().signal;
const answer = (questionId: QuestionId, value: string): DemoAction => ({ type: 'answer', questionId, value });
const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function startAtConcerns(service: MockService) {
  await service.respond({ type: 'start' }, signal());
  await service.respond(answer('wellbeing', 'Difficult at times'), signal());
}

async function skipToReview(service: MockService) {
  await service.respond({ type: 'start' }, signal());
  for (const questionId of questionOrder) await service.respond({ type: 'skip', questionId }, signal());
}

test('the normal path preserves submitted answers through review and one completion', async () => {
  const service = createMockService('normal', 0);
  const initial = service.getSnapshot();
  assert.equal(initial.stage, 'welcome');
  assert.equal(service.getSnapshot(), initial, 'unchanged snapshots have stable identity');
  await service.respond({ type: 'start' }, signal());
  await service.respond(answer('wellbeing', '  Difficult at times  '), signal());
  await service.respond(answer('concerns', 'Coursework has been on my mind.'), signal());
  await service.respond(answer('impact', 'I have found it harder to concentrate.'), signal());
  const review = service.getSnapshot();
  assert.equal(review.stage, 'review');
  assert.deepEqual(review.answers, [
    { questionId: 'wellbeing', status: 'answered', value: 'Difficult at times' },
    { questionId: 'concerns', status: 'answered', value: 'Coursework has been on my mind.' },
    { questionId: 'impact', status: 'answered', value: 'I have found it harder to concentrate.' },
  ]);
  assert.equal(review.request, null);
  assert.equal(review.completion, null);
  assert.deepEqual(initial.answers, [], 'earlier snapshots are not mutated');
  const reply = await service.respond({ type: 'complete' }, signal());
  const completed = service.getSnapshot();
  assert.equal(completed.stage, 'completed');
  assert.ok(completed.completion?.id);
  assert.equal(completed.answers, review.answers);
  assert.match(reply, /No information was sent to UHC/);
  await service.respond({ type: 'complete' }, signal());
  assert.equal(service.getSnapshot(), completed, 'a repeated completion has no new record');
});

for (const scenario of ['normal', 'risk'] as const) {
  test('all questions can be skipped in the ' + scenario + ' fixture without inventing answers', async () => {
    const service = createMockService(scenario, 0);
    await skipToReview(service);
    assert.equal(service.getSnapshot().stage, 'review');
    assert.deepEqual(service.getSnapshot().answers, questionOrder.map((questionId) => ({ questionId, status: 'skipped' })));
    assert.equal(service.getSnapshot().request, null, 'skipping concerns never creates a risk response');
    await service.respond({ type: 'complete' }, signal());
    assert.equal(service.getSnapshot().stage, 'completed');
  });
}

test('question binding rejects out-of-order, repeated, empty, and late answers without changing records', async () => {
  const service = createMockService('normal', 0);
  await assert.rejects(service.respond(answer('wellbeing', 'too early'), signal()), /current question/);
  await service.respond({ type: 'start' }, signal());
  const before = service.getSnapshot();
  await assert.rejects(service.respond(answer('concerns', 'wrong question'), signal()), /current question/);
  await assert.rejects(service.respond({ type: 'skip', questionId: 'impact' }, signal()), /current question/);
  await assert.rejects(service.respond(answer('wellbeing', '   '), signal()), /Enter a response/);
  await assert.rejects(service.respond({ type: 'complete' }, signal()), /Review all three/);
  assert.equal(service.getSnapshot(), before);
  await service.respond(answer('wellbeing', 'A submitted answer'), signal());
  const after = service.getSnapshot();
  await assert.rejects(service.respond(answer('wellbeing', 'a stale repeated answer'), signal()), /current question/);
  assert.equal(service.getSnapshot(), after);
  await service.respond({ type: 'skip', questionId: 'concerns' }, signal());
  await service.respond({ type: 'skip', questionId: 'impact' }, signal());
  await service.respond({ type: 'complete' }, signal());
  await assert.rejects(service.respond(answer('impact', 'after completion'), signal()), /current question/);
});

test('a pending submission uses its original question and value, not a changed action object', async () => {
  const service = createMockService('normal', 10);
  await service.respond({ type: 'start' }, signal());
  const action: { type: 'answer'; questionId: QuestionId; value: string } = { type: 'answer', questionId: 'wellbeing', value: 'Submitted text' };
  const pending = service.respond(action, signal());
  action.questionId = 'impact';
  action.value = 'Text changed after submission';
  await pending;
  assert.deepEqual(service.getSnapshot().answers, [{ questionId: 'wellbeing', status: 'answered', value: 'Submitted text' }]);
  assert.equal(service.getSnapshot().stage, 'concerns');
});

test('only the risk fixture branches; normal input is not classified by keywords', async () => {
  const normal = createMockService('normal', 0);
  await startAtConcerns(normal);
  await normal.respond(answer('concerns', riskExample), signal());
  assert.equal(normal.getSnapshot().stage, 'impact');
  assert.equal(normal.getSnapshot().request, null);

  const risk = createMockService('risk', 0);
  await startAtConcerns(risk);
  const pending = risk.respond(answer('concerns', 'This is a fixed classroom input.'), signal());
  const sending = risk.getSnapshot();
  assert.equal(sending.stage, 'handover');
  assert.equal(sending.request?.status, 'sending');
  assert.equal(sending.request?.origin, 'risk-scenario');
  assert.deepEqual(sending.request?.answers, [
    { questionId: 'wellbeing', status: 'answered', value: 'Difficult at times' },
    { questionId: 'concerns', status: 'answered', value: 'This is a fixed classroom input.' },
  ]);
  const reply = await pending;
  assert.equal(risk.getSnapshot().request?.status, 'delivered');
  assert.match(reply, /waiting for a staff member/);
  assert.equal(risk.getSnapshot().completion, null);
  await assert.rejects(risk.respond(answer('impact', 'must not continue the questionnaire'), signal()), /current question/);
  await assert.rejects(risk.respond({ type: 'complete' }, signal()), /Review all three/);
});

test('request payload contains explicit submitted records and skipped status, never extra action fields', async () => {
  const service = createMockService('risk', 0);
  await service.respond({ type: 'start' }, signal());
  const skipWithUnsubmittedText = { type: 'skip', questionId: 'wellbeing', value: 'A private unsent draft' } as DemoAction;
  await service.respond(skipWithUnsubmittedText, signal());
  await service.respond(answer('concerns', riskExample), signal());
  assert.deepEqual(service.getSnapshot().request?.answers, [
    { questionId: 'wellbeing', status: 'skipped' },
    { questionId: 'concerns', status: 'answered', value: riskExample },
  ]);
  assert.doesNotMatch(JSON.stringify(service.getSnapshot()), /private unsent draft/);
});

test('a failed request retries the same id and payload, then connects only through a separate event', async () => {
  const service = createMockService('risk', 0);
  await startAtConcerns(service);
  service.setOutcome('failed');
  await service.respond(answer('concerns', riskExample), signal());
  const failed = service.getSnapshot().request!;
  assert.equal(failed.status, 'failed');
  assert.throws(() => service.connectStaff(), /only join a delivered request/);
  service.setOutcome('delivered');
  const retry = service.respond({ type: 'retry-handover' }, signal());
  assert.equal(service.getSnapshot().request?.status, 'sending');
  await retry;
  const delivered = service.getSnapshot();
  assert.equal(delivered.request?.status, 'delivered');
  assert.equal(delivered.request?.id, failed.id);
  assert.equal(delivered.request?.answers, failed.answers);
  assert.equal(failed.status, 'failed', 'previous request snapshots are not mutated');
  await service.respond({ type: 'retry-handover' }, signal());
  assert.equal(service.getSnapshot(), delivered, 'a delivered request is not sent again');
  service.connectStaff();
  const connected = service.getSnapshot();
  assert.equal(connected.stage, 'handover');
  assert.equal(connected.request?.status, 'connected');
  assert.equal(connected.request?.id, failed.id);
  assert.equal(connected.request?.answers, failed.answers);
  assert.equal(connected.completion, null, 'handover is a different endpoint from questionnaire completion');
  service.connectStaff();
  await service.respond({ type: 'retry-handover' }, signal());
  assert.equal(service.getSnapshot(), connected);
});

test('invalid handover events and overlapping actions cannot create requests or duplicate completion', async () => {
  const service = createMockService('normal', 10);
  assert.throws(() => service.connectStaff(), /only join a delivered request/);
  await assert.rejects(service.respond({ type: 'retry-handover' }, signal()), /no failed request/);
  const starting = service.respond({ type: 'start' }, signal());
  await assert.rejects(service.respond({ type: 'start' }, signal()), { name: 'BusyError' });
  await starting;
  for (const questionId of questionOrder) await service.respond({ type: 'skip', questionId }, signal());
  const finishing = service.respond({ type: 'complete' }, signal());
  await assert.rejects(service.respond({ type: 'complete' }, signal()), { name: 'BusyError' });
  await finishing;
  assert.ok(service.getSnapshot().completion?.id);
});

test('cancelling a normal answer leaves its question and records unchanged, and permits a fresh answer', async () => {
  const service = createMockService('normal', 15);
  await service.respond({ type: 'start' }, signal());
  const before = service.getSnapshot();
  const controller = new AbortController();
  const pending = service.respond(answer('wellbeing', 'Cancelled text'), controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  await pause(20);
  assert.equal(service.getSnapshot(), before);
  await service.respond(answer('wellbeing', 'A fresh submission'), signal());
  assert.equal(service.getSnapshot().answers[0].value, 'A fresh submission');
});

test('cancelling completion leaves the review intact', async () => {
  const service = createMockService('normal', 10);
  await skipToReview(service);
  const before = service.getSnapshot();
  const controller = new AbortController();
  const pending = service.respond({ type: 'complete' }, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(service.getSnapshot(), before);
  assert.equal(service.getSnapshot().completion, null);
});

test('cancelling risk delivery or retry preserves the committed answer and same failed request', async () => {
  const service = createMockService('risk', 10);
  await startAtConcerns(service);
  const controller = new AbortController();
  const delivery = service.respond(answer('concerns', riskExample), controller.signal);
  const created = service.getSnapshot().request!;
  controller.abort();
  await assert.rejects(delivery, { name: 'AbortError' });
  assert.equal(service.getSnapshot().stage, 'handover');
  assert.equal(service.getSnapshot().request?.status, 'failed');
  assert.equal(service.getSnapshot().request?.id, created.id);
  assert.equal(service.getSnapshot().request?.answers, created.answers);
  const retryController = new AbortController();
  const retry = service.respond({ type: 'retry-handover' }, retryController.signal);
  retryController.abort();
  await assert.rejects(retry, { name: 'AbortError' });
  assert.equal(service.getSnapshot().request?.status, 'failed');
  assert.equal(service.getSnapshot().request?.id, created.id);
  assert.equal(service.getSnapshot().request?.answers, created.answers);
  assert.equal(service.getSnapshot().answers.length, 2);
});

test('an already aborted risk action cannot record an answer or start delivery', async () => {
  const service = createMockService('risk', 0);
  await startAtConcerns(service);
  const before = service.getSnapshot();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(service.respond(answer('concerns', riskExample), controller.signal), { name: 'AbortError' });
  assert.equal(service.getSnapshot(), before);
});

test('disposing an in-flight answer prevents late state writes and subscriber calls', async () => {
  const service = createMockService('normal', 15);
  await service.respond({ type: 'start' }, signal());
  let calls = 0;
  service.subscribe(() => { calls += 1; });
  const before = service.getSnapshot();
  const pending = service.respond(answer('wellbeing', 'Old session text'), signal());
  service.dispose();
  service.dispose();
  await assert.rejects(pending, { name: 'AbortError' });
  await pause(20);
  assert.equal(service.getSnapshot(), before);
  assert.equal(calls, 0);
  await assert.rejects(service.respond(answer('wellbeing', 'Too late'), signal()), { name: 'AbortError' });
  service.setOutcome('failed');
  service.connectStaff();
  assert.equal(service.getSnapshot(), before);
});

test('disposing during delivery prevents both late success and cancellation writes to the old session', async () => {
  const service = createMockService('risk', 10);
  await startAtConcerns(service);
  let calls = 0;
  service.subscribe(() => { calls += 1; });
  const pending = service.respond(answer('concerns', riskExample), signal());
  const sending = service.getSnapshot();
  assert.equal(calls, 1);
  service.dispose();
  await assert.rejects(pending, { name: 'AbortError' });
  await pause(15);
  assert.equal(service.getSnapshot(), sending);
  assert.equal(calls, 1);
});

test('subscribers can unsubscribe and unchanged outcome settings do not publish new snapshots', () => {
  const service = createMockService('normal', 0);
  let calls = 0;
  const unsubscribe = service.subscribe(() => { calls += 1; });
  const before = service.getSnapshot();
  service.setOutcome('delivered');
  assert.equal(service.getSnapshot(), before);
  service.setOutcome('failed');
  assert.equal(calls, 1);
  unsubscribe();
  service.setOutcome('delivered');
  assert.equal(calls, 1);
});
