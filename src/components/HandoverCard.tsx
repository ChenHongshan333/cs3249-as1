import { Check, LifeBuoy, LoaderCircle, RotateCcw, UserCheck } from 'lucide-react';
import { Button } from './Button';
import type { HandoverStatus } from '../mock/service';

const statusCopy: Record<HandoverStatus, [string, string]> = {
  sending: ['Sending a simulated support request…', 'The pre-consultation is paused while the request is sent.'],
  delivered: ['Simulated request delivered', 'The demo service received the request. A staff member has not taken over yet.'],
  failed: ['The simulated request was not delivered', 'Your submitted answers are still here. You can try sending the request again.'],
  connected: ['Simulated staff handover complete', 'The demo now marks a staff member as having taken over. The automated pre-consultation has ended.'],
};

export function HandoverCard({ status, onRetry, disabled }: {
  status: HandoverStatus; onRetry: () => void; disabled: boolean;
}) {
  const [title, description] = statusCopy[status];
  const Icon = { sending: LoaderCircle, delivered: Check, failed: LifeBuoy, connected: UserCheck }[status];
  return (
    <section className="handover-card handover-status" data-status={status} aria-label="Support request">
      <span className="status-icon"><Icon size={23} aria-hidden="true" /></span>
      <div className="status-copy" role="status"><h2>{title}</h2><p>{description}</p></div>
      {status === 'failed' && (
        <div className="handover-actions">
          <Button onClick={onRetry} disabled={disabled}><RotateCcw size={16} aria-hidden="true" />Try again</Button>
        </div>
      )}
    </section>
  );
}
