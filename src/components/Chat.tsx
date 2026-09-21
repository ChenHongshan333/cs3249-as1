import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useAuiState } from '@assistant-ui/react';
import { ArrowDown, Bot, RotateCcw, Send } from 'lucide-react';
import type { ReactNode, SyntheticEvent } from 'react';

type Props = {
  children: ReactNode;
  onRestart: () => void;
  inputEnabled: boolean;
  placeholder: string;
  draftNotice: string;
  onPrepareSend: () => boolean;
};

export function Chat({ children, onRestart, draftNotice, ...composer }: Props) {
  return (
    <ThreadPrimitive.Root className="chat-thread">
      <ThreadPrimitive.Viewport className="chat-viewport">
        <div className="conversation">
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
          <div className="scenario-region">
            {children}
            {draftNotice && (
              <p className="draft-notice" role="status">{draftNotice}</p>
            )}
          </div>
          <button type="button" className="restart-button" onClick={onRestart}>
            <RotateCcw size={17} aria-hidden="true" />
            Restart demo
          </button>
        </div>
        <ThreadPrimitive.ScrollToBottom
          className="scroll-to-bottom"
          aria-label="Scroll to latest message"
        >
          <ArrowDown size={19} />
        </ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Viewport>
      <ChatComposer {...composer} />
    </ThreadPrimitive.Root>
  );
}

function AssistantMessage() {
  const running = useAuiState((s) => s.message.status?.type === 'running');
  return (
    <MessagePrimitive.Root className="message message-assistant">
      <span className="message-avatar">
        <Bot size={27} aria-hidden="true" />
      </span>
      <div className="message-body">
        <span className="message-name">Lumen</span>
        <div className="message-bubble">
          <MessagePrimitive.Parts />
          {running && (
            <span className="message-pending" role="status">Processing…</span>
          )}
        </div>
        <MessagePrimitive.Error>
          <p className="message-error" role="alert">
            This step was interrupted. Restart the demo to try again.
          </p>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}

function UserMessage() {
  const isAction = useAuiState((s) => s.message.metadata.custom.isAction === true);
  if (isAction) return (
    <MessagePrimitive.Root className="message-action">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
  return (
    <MessagePrimitive.Root className="message message-user">
      <div className="message-body">
        <span className="message-name">You</span>
        <div className="message-bubble">
          <MessagePrimitive.Parts />
        </div>
      </div>
      <span className="message-avatar" aria-hidden="true">YO</span>
    </MessagePrimitive.Root>
  );
}

function ChatComposer({
  inputEnabled,
  placeholder,
  onPrepareSend,
}: Pick<Props, 'inputEnabled' | 'placeholder' | 'onPrepareSend'>) {
  const running = useAuiState((s) => s.thread.isRunning);
  function prepare(event: SyntheticEvent) {
    if (!onPrepareSend()) event.preventDefault();
  }
  return (
    <footer className="composer-dock">
      <ComposerPrimitive.Root className="composer-shell" onSubmit={prepare}>
        <ComposerPrimitive.Input
          className="composer-input"
          aria-label="Your answer"
          autoFocus
          disabled={!inputEnabled || running}
          placeholder={placeholder}
          submitMode="enter"
          rows={1}
          cancelOnEscape={false}
        />
        <ComposerPrimitive.Send
          className="composer-send"
          aria-label="Send answer"
          disabled={!inputEnabled || running}
          onClick={prepare}
        >
          <Send size={24} />
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
      <p className="composer-caption">
        Teaching prototype · Fictional data · No messages are sent to UHC
      </p>
    </footer>
  );
}
