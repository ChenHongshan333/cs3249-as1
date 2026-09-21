import {
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ChevronLeft, FilePlus2, Globe2, MessageSquarePlus, Mic,
  NotebookPen, PlusSquare, Search, Send,
} from 'lucide-react';
import paperTop from '../assets/paper-page-top.png';
import paperBottom from '../assets/paper-page-bottom.png';

type Screen = 'landing' | 'goals' | 'prompts' | 'conversation' | 'notes';
type Message = { id: number; role: 'user' | 'assistant'; text: string; source?: string };
type PaperSource = { url: string; name: string; local: boolean };
type PanelPosition = { top: number; left: number };

const TITLE = 'MDA: A Formal Approach to Game Design and Game Research';
const prompts = [
  "Summarise the paper's main argument.",
  'What is the MDA framework?',
  'How can I apply MDA to analyse a game?',
  'What are the limitations of the framework?',
];
const responses = [
  'The paper introduces MDA—a framework that separates games into Mechanics, Dynamics, and Aesthetics—to show how designed rules lead to player behaviour and emotional experience. Its central argument is that designers and players move through these layers in opposite directions.',
  'The MDA framework explains games through three connected layers:\n\nMechanics — the rules, data, and actions designed into the game.\nDynamics — the behaviours that emerge while people play.\nAesthetics — the emotional experiences those dynamics create.\n\nDesigners usually move from mechanics toward aesthetics; players experience the relationship in the opposite direction.',
  'Start with the player experience you observe, name the aesthetic it creates, then trace it back to the dynamics and mechanics that produce it. For example, a shrinking safe zone is a mechanic; forced encounters are a dynamic; tension and urgency are the resulting aesthetics.',
  'MDA is useful as a shared vocabulary, but its three layers can oversimplify social, cultural, and narrative context. It also suggests a linear chain even though real play is iterative: players reinterpret rules, communities change dynamics, and designers revise the system.',
];

export function PaperLensWorkspace() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [paperLoaded, setPaperLoaded] = useState(false);
  const [paperSource, setPaperSource] = useState<PaperSource | null>(null);
  const [viewerWidth, setViewerWidth] = useState(430);
  const [zoom, setZoom] = useState(100);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [languagePanelPosition, setLanguagePanelPosition] = useState<PanelPosition | null>(null);
  const [language, setLanguage] = useState('English');
  const [goal, setGoal] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [responding, setResponding] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const responseTimerRef = useRef<number | null>(null);

  const showPaper = (source: PaperSource | null) => {
    setPaperSource(source);
    setPaperLoaded(true);
    setScreen('goals');
  };
  const loadLocalPaper = (file: File) => showPaper({
    url: URL.createObjectURL(file),
    name: file.name,
    local: true,
  });
  const loadPaperUrl = (url: string) => showPaper(url ? {
    url,
    name: 'Paper from link',
    local: false,
  } : null);
  const newConversation = () => {
    if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current);
    setGoal(''); setMessages([]); setDraft('');
    setResponding(false); setHistoryOpen(false); setLanguagePanelPosition(null);
    setPaperLoaded(false); setPaperSource(null); setZoom(100); setViewerWidth(430);
    setLanguage('English'); messageRefs.current = [];
    setScreen('landing');
  };
  const openLanguage = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const panelWidth = Math.min(375, window.innerWidth - 24);
    setLanguagePanelPosition({
      top: rect.bottom + 10,
      left: Math.max(12, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 12)),
    });
  };
  const chooseGoal = (nextGoal: string) => { setGoal(nextGoal); setMessages([]); setScreen('prompts'); };
  const addExchange = (question: string, answer?: string) => {
    const number = messages.filter((item) => item.role === 'user').length;
    const answerIndex = Math.min(number, responses.length - 1);
    const seed = Date.now();
    setMessages((current) => [...current, { id: seed, role: 'user', text: question }]);
    setScreen('conversation'); setDraft(''); setResponding(true);
    responseTimerRef.current = window.setTimeout(() => {
      setMessages((current) => [...current, {
        id: seed + 1, role: 'assistant', text: answer ?? responses[answerIndex],
        source: answerIndex === 1 ? 'highlighted passage + MDA overview' : 'MDA overview and opening sections',
      }]);
      setResponding(false);
      responseTimerRef.current = null;
    }, 280);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim() && !responding) addExchange(draft.trim());
  };
  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = viewerWidth;
    const onMove = (moveEvent: PointerEvent) => setViewerWidth(
      Math.max(300, Math.min(600, startWidth + moveEvent.clientX - startX)),
    );
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  useEffect(() => {
    if (!responding && messages.length) {
      contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, responding]);
  useEffect(() => () => {
    if (paperSource?.local) URL.revokeObjectURL(paperSource.url);
  }, [paperSource]);
  useEffect(() => () => {
    if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current);
  }, []);

  const questionCount = messages.filter((item) => item.role === 'user').length;
  return (
    <main className="paperlens-workspace" style={{ '--viewer-width': `${viewerWidth}px` } as CSSProperties}>
      <section className="paper-pane" aria-label="Paper viewer">
        {paperLoaded
          ? <PaperViewer zoom={zoom} setZoom={setZoom} source={paperSource} />
          : <LandingUpload onFile={loadLocalPaper} onUrl={loadPaperUrl} />}
      </section>
      <button className="splitter" onPointerDown={startResize} aria-label="Resize paper and conversation panels">
        <span aria-hidden="true">›</span>
      </button>
      <section className="reading-pane">
        <Header paperTitle={paperLoaded ? (paperSource?.name.replace(/\.pdf$/i, '') || TITLE) : null}
          onHistory={() => setHistoryOpen(true)} onNew={newConversation}
          onLanguage={openLanguage} onNotes={() => setScreen('notes')} />
        <div className="reading-body" ref={contentRef}>
          {goal && screen !== 'notes' && <div className="goal-chip">Goal: {goal}</div>}
          {screen === 'landing' && <Welcome />}
          {screen === 'goals' && <GoalPicker onChoose={chooseGoal} />}
          {screen === 'prompts' && <PromptPicker onChoose={(question, index) => addExchange(question, responses[index])} />}
          {screen === 'conversation' && <Conversation messages={messages} refs={messageRefs} responding={responding} />}
          {screen === 'notes' && <SessionNotes onBack={() => setScreen(messages.length ? 'conversation' : paperLoaded ? 'goals' : 'landing')} />}
        </div>
        {screen !== 'notes' && <Composer draft={draft} setDraft={setDraft} onSubmit={submit} disabled={!paperLoaded || responding} />}
        {screen === 'conversation' && questionCount > 0 && (
          <QuestionNavigator count={questionCount} onSelect={(index) => messageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
        )}
      </section>
      {historyOpen && <HistoryDrawer onClose={() => setHistoryOpen(false)} onSelect={() => setHistoryOpen(false)} />}
      {languagePanelPosition && <LanguagePanel selected={language} position={languagePanelPosition}
        onSelect={(next) => { setLanguage(next); setLanguagePanelPosition(null); }}
        onClose={() => setLanguagePanelPosition(null)} />}
    </main>
  );
}

function Header({ paperTitle, onHistory, onNew, onLanguage, onNotes }: {
  paperTitle: string | null; onHistory: () => void; onNew: () => void;
  onLanguage: (event: ReactMouseEvent<HTMLButtonElement>) => void; onNotes: () => void;
}) {
  return <header className="workspace-header">
    <div className="title-line">
      <button className="brand-title" onClick={onHistory} title="Open chat history">PaperLens</button>
      <span className="title-slash">/</span><span className="paper-title">{paperTitle || 'Paper title'}</span>
    </div>
    <div className="header-actions">
      <IconButton label="Start a new conversation" onClick={onNew}><MessageSquarePlus /></IconButton>
      <IconButton label="Language settings" onClick={onLanguage}><Globe2 /></IconButton>
      <IconButton label="Notes" onClick={onNotes}><NotebookPen /></IconButton>
    </div>
  </header>;
}

function IconButton({ label, onClick, children }: {
  label: string; onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void; children: ReactNode;
}) {
  return <button className="icon-button" onClick={onClick} aria-label={label} data-tooltip={label}>{children}</button>;
}

function LandingUpload({ onFile, onUrl }: { onFile: (file: File) => void; onUrl: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [paperUrl, setPaperUrl] = useState('');
  const [error, setError] = useState('');
  const acceptFile = (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.');
      return;
    }
    setError('');
    onFile(file);
  };
  const browse = () => inputRef.current?.click();
  return <div className="upload-page"><div className="upload-card" role="button" tabIndex={0} onClick={browse}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); browse(); } }}
    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
    onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files[0]); }}>
    <input ref={inputRef} className="file-input" type="file" accept="application/pdf,.pdf" onClick={(event) => event.stopPropagation()}
      aria-label="Choose a PDF file" onChange={(event) => { acceptFile(event.target.files?.[0]); event.target.value = ''; }} />
    <FilePlus2 aria-hidden="true" /><span>Drop a PDF here<br />or click to browse</span>
    <span className="url-field" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <input value={paperUrl} onChange={(event) => setPaperUrl(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') onUrl(paperUrl.trim()); }}
        placeholder="Paste a DOI or paper URL" aria-label="Paper URL" />
      <button type="button" onClick={() => onUrl(paperUrl.trim())}>Open</button>
    </span>
    {error && <span className="upload-error" role="alert">{error}</span>}
    <small>PDF · DOI · arXiv URL</small>
  </div></div>;
}

function PaperViewer({ zoom, setZoom, source }: {
  zoom: number; setZoom: (value: number) => void; source: PaperSource | null;
}) {
  if (source) return <div className="paper-viewer local-pdf-viewer">
    <iframe className="local-pdf-frame" src={`${source.url}#view=FitH`} title={`PDF preview: ${source.name}`} />
  </div>;
  const nextZoom = zoom === 80 ? 100 : zoom === 100 ? 125 : 80;
  return <div className="paper-viewer">
    <button className="zoom-button" onClick={() => setZoom(nextZoom)} title="Change zoom">{zoom}% <span>⌄</span></button>
    <div className="paper-scroll"><div className="paper-pages" style={{ width: `${zoom}%` }}>
      <img src={paperTop} alt="First page of the MDA research paper" />
      <img src={paperBottom} alt="Second page of the MDA research paper" />
    </div></div>
  </div>;
}

function Welcome() { return <div className="welcome"><p>Hello, Hongshan!</p><p>Let’s start reading a paper :)</p></div>; }

function GoalPicker({ onChoose }: { onChoose: (goal: string) => void }) {
  const goals = ['Get a general overview of this paper', 'Reproduce the study or method', 'Other — type a goal in the chat'];
  return <div className="choice-screen"><h1>What would you like to learn?</h1><div className="choice-card">
    {goals.map((item) => <button key={item} onClick={() => onChoose(item)}>{item}</button>)}
  </div></div>;
}

function PromptPicker({ onChoose }: { onChoose: (question: string, index: number) => void }) {
  return <div className="prompt-screen"><h1>Choose a question to begin</h1><div className="prompt-grid">
    {prompts.slice(0, 3).map((item, index) => <button key={item} onClick={() => onChoose(item, index)}>{item}</button>)}
  </div></div>;
}

function Conversation({ messages, refs, responding }: { messages: Message[]; refs: RefObject<Array<HTMLDivElement | null>>; responding: boolean }) {
  let questionIndex = -1;
  return <div className="conversation">{messages.map((message) => {
    if (message.role === 'user') questionIndex += 1;
    const current = questionIndex;
    return <div key={message.id} ref={(node) => { if (message.role === 'user') refs.current[current] = node; }} className={`message ${message.role}`}>
      <div className="message-copy">{message.text}</div>
      {message.source && <small className="source">SOURCE · {message.source}</small>}
    </div>;
  })}{responding && <div className="message assistant thinking"><span /><span /><span /></div>}</div>;
}

function Composer({ draft, setDraft, onSubmit, disabled }: { draft: string; setDraft: (value: string) => void; onSubmit: (event: FormEvent) => void; disabled: boolean }) {
  return <form className="composer" onSubmit={onSubmit}>
    <button type="button" className="composer-tool" aria-label="Add attachment"><PlusSquare /></button>
    <textarea value={draft} onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
      placeholder={disabled ? 'Load a paper to start a conversation…' : 'Ask a follow-up question…'} rows={1} disabled={disabled} />
    <button type="button" className="composer-tool" aria-label="Voice input"><Mic /></button>
    <button type="submit" className="send-button" aria-label="Send message" disabled={disabled || !draft.trim()}><Send /></button>
  </form>;
}

function QuestionNavigator({ count, onSelect }: { count: number; onSelect: (index: number) => void }) {
  return <nav className="question-nav" aria-label="Jump to a question">
    {Array.from({ length: count }, (_, index) => <button key={index} onClick={() => onSelect(index)} aria-label={`Go to question ${index + 1}`} />)}
  </nav>;
}

function HistoryDrawer({ onClose, onSelect }: { onClose: () => void; onSelect: () => void }) {
  const items = [['CURRENT SESSION', 'MDA: framework, direction and player experience'], ['YESTERDAY', 'Dark patterns and player autonomy'], ['18 SEP', 'Embodied interaction · lecture notes']];
  return <aside className="history-drawer" aria-label="Chat history">
    <div className="drawer-heading"><h2>Chat history</h2><button onClick={onClose} aria-label="Close history"><ChevronLeft /></button></div>
    <small>THIS DEVICE</small><div className="history-list">{items.map(([date, title]) =>
      <button key={title} onClick={onSelect}><small>{date}</small><span>{title}</span></button>,
    )}</div>
  </aside>;
}

function LanguagePanel({ selected, position, onSelect, onClose }: {
  selected: string; position: PanelPosition; onSelect: (value: string) => void; onClose: () => void;
}) {
  const languages = ['English', '中文（简体）', '中文（繁體）', '日本語', 'More languages…'];
  return <div className="modal-scrim" onMouseDown={onClose}><section className="language-panel" aria-label="Language settings"
    style={{ top: position.top, left: position.left }} onMouseDown={(event) => event.stopPropagation()}>
    <div className="language-search"><Search /><span>Choose your preferred response language</span></div>
    {languages.map((item) => <button key={item} className={selected === item ? 'active' : ''} onClick={() => onSelect(item)}><span>{item}</span>{item === 'English' && <small>default</small>}</button>)}
    <p>Responses only · paper text stays unchanged</p>
  </section></div>;
}

function SessionNotes({ onBack }: { onBack: () => void }) {
  return <div className="notes-page"><button className="back-link" onClick={onBack}><ChevronLeft /> Back to conversation</button>
    <div className="notes-heading"><div><span>SESSION NOTES</span><h1>MDA framework</h1></div><NotebookPen /></div>
    <p className="notes-intro">A live synthesis of the paper and your conversation. Notes update as you ask new questions.</p>
    <h2>Framework map</h2><div className="framework-map"><MapBox label="Mechanics" text="Rules, data & actions" /><span>→</span><MapBox label="Dynamics" text="Emergent play behaviour" /><span>→</span><MapBox label="Aesthetics" text="Emotional experience" /></div>
    <h2>Critical thinking</h2><div className="note-grid">
      <NoteCard title="Central claim" text="Designers build from mechanics toward experience; players encounter the system in reverse." />
      <NoteCard title="Useful application" text="Trace an observed feeling back through player behaviour to the rule that produced it." />
      <NoteCard title="Open question" text="How well does a linear model capture culture, community and unexpected player interpretation?" />
    </div>
  </div>;
}

function MapBox({ label, text }: { label: string; text: string }) { return <div><strong>{label}</strong><small>{text}</small></div>; }
function NoteCard({ title, text }: { title: string; text: string }) { return <article><small>{title}</small><p>{text}</p></article>; }
