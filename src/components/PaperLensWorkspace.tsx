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
type AnswerLayer = { label: string; text: string };
type SuggestedQuestion = { text: string; responseIndex: number };
type SourceLocation = {
  page: number;
  kind: 'passage' | 'figure';
  label: string;
  searchTerm: string;
  topPercent: number;
  heightPercent: number;
};
type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  layers?: AnswerLayer[];
  suggestions?: SuggestedQuestion[];
  source?: SourceLocation;
};
type PaperSource = { url: string; name: string; local: boolean };
type PanelPosition = { top: number; left: number };
type ResearchJudgment = 'Use as proposed' | 'Use with adaptations' | 'Do not use' | 'Need more evidence';

const TITLE = 'MDA: A Formal Approach to Game Design and Game Research';
const RESEARCH_USE_GOAL = 'Explore potential use in my research';
const CRITICAL_REVIEW_QUESTION = 'Evaluate whether the MDA framework is applicable to my research.';
const CRITICAL_REVIEW_RESPONSE = 'MDA is useful as an initial analytical scaffold for studying how game mechanics shape player experience, but it should not be treated as a complete explanatory model.';
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
const responseDetails: Array<{
  layers: AnswerLayer[];
  suggestions: SuggestedQuestion[];
  source: SourceLocation;
}> = [
  {
    layers: [
      { label: 'Key concepts', text: 'Mechanics describe designed rules, Dynamics describe behaviour that emerges during play, and Aesthetics describe the emotional experience of the player.' },
      { label: 'Evidence from the paper', text: 'The authors present MDA as a framework for connecting game design decisions to consumption and player experience, while distinguishing the designer’s and player’s directions of attention.' },
      { label: 'Why it matters', text: 'The framework gives designers, researchers, and players a shared vocabulary for discussing how formal rules may produce experienced outcomes.' },
    ],
    suggestions: [
      { text: 'What is the MDA framework?', responseIndex: 1 },
      { text: 'How can I apply MDA to analyse a game?', responseIndex: 2 },
      { text: 'What are the limitations of the framework?', responseIndex: 3 },
    ],
    source: { page: 1, kind: 'passage', label: 'Towards a Comprehensive Framework', searchTerm: 'Towards a Comprehensive Framework', topPercent: 18, heightPercent: 29 },
  },
  {
    layers: [
      { label: 'Technical detail', text: 'Mechanics are the components and rules available to the player. Their interaction over time creates system-level Dynamics, which support experiential Aesthetic goals such as challenge, discovery, or fellowship.' },
      { label: 'Evidence from the figure', text: 'The framework diagram visually connects Mechanics, Dynamics, and Aesthetics and shows the opposing perspectives of designers and players.' },
      { label: 'Research relevance', text: 'These categories can become an initial coding structure, but observed player data is still needed to support claims about actual experience.' },
    ],
    suggestions: [
      { text: 'How can I apply MDA to analyse a game?', responseIndex: 2 },
      { text: 'What are the limitations of the framework?', responseIndex: 3 },
    ],
    source: { page: 1, kind: 'figure', label: 'MDA framework diagram', searchTerm: 'Mechanics Dynamics Aesthetics', topPercent: 63, heightPercent: 25 },
  },
  {
    layers: [
      { label: 'Worked example', text: 'In a battle-royale game, a shrinking safe zone is a Mechanic; increasingly frequent player encounters are a Dynamic; tension and urgency are Aesthetic outcomes.' },
      { label: 'Analysis steps', text: 'Describe the experienced outcome, identify the behaviour that produced it, trace that behaviour to specific rules, and then check the interpretation against player evidence.' },
      { label: 'Research relevance', text: 'Use the chain as a hypothesis-generating structure rather than assuming that a mechanic causes the same experience for every player.' },
    ],
    suggestions: [
      { text: 'What evidence should I collect from players?', responseIndex: 2 },
      { text: 'What are the limitations of the framework?', responseIndex: 3 },
    ],
    source: { page: 2, kind: 'figure', label: 'Designer and player perspectives', searchTerm: 'designer player', topPercent: 5, heightPercent: 35 },
  },
  {
    layers: [
      { label: 'Assumptions', text: 'MDA assumes that the three categories can be distinguished and that designers can reason from rules toward intended experiences.' },
      { label: 'Uncertainty', text: 'The paper is primarily conceptual, so using MDA as a research method requires additional empirical validation in the learner’s own context.' },
      { label: 'Required adaptation', text: 'Add social, cultural, narrative, and community factors, and treat relationships between the layers as iterative rather than strictly linear.' },
    ],
    suggestions: [
      { text: 'How could I adapt MDA for qualitative research?', responseIndex: 2 },
    ],
    source: { page: 2, kind: 'passage', label: 'Discussion of models and iterative design', searchTerm: 'iterative design', topPercent: 48, heightPercent: 34 },
  },
];

export function PaperLensWorkspace() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [paperLoaded, setPaperLoaded] = useState(false);
  const [paperSource, setPaperSource] = useState<PaperSource | null>(null);
  const [paperLocation, setPaperLocation] = useState<SourceLocation | null>(null);
  const [viewerWidth, setViewerWidth] = useState(430);
  const [zoom, setZoom] = useState(100);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [languagePanelPosition, setLanguagePanelPosition] = useState<PanelPosition | null>(null);
  const [language, setLanguage] = useState('English');
  const [goal, setGoal] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [responding, setResponding] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [researchJudgment, setResearchJudgment] = useState<ResearchJudgment | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const responseTimerRef = useRef<number | null>(null);

  const showPaper = (source: PaperSource | null) => {
    setPaperSource(source);
    setPaperLocation(null);
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
    setReviewComplete(false); setResearchJudgment(null);
    setPaperLoaded(false); setPaperSource(null); setPaperLocation(null); setZoom(100); setViewerWidth(430);
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
  const chooseGoal = (nextGoal: string) => {
    setGoal(nextGoal); setMessages([]); setReviewComplete(false); setResearchJudgment(null); setScreen('prompts');
  };
  const addExchange = (question: string, responseOverride?: number) => {
    const number = messages.filter((item) => item.role === 'user').length;
    const answerIndex = responseOverride ?? Math.min(number, responses.length - 1);
    const details = responseDetails[answerIndex];
    const seed = Date.now();
    setMessages((current) => [...current, { id: seed, role: 'user', text: question }]);
    setScreen('conversation'); setDraft(''); setResponding(true);
    responseTimerRef.current = window.setTimeout(() => {
      setMessages((current) => [...current, {
        id: seed + 1,
        role: 'assistant',
        text: responses[answerIndex],
        layers: details.layers,
        suggestions: details.suggestions,
        source: details.source,
      }]);
      setResponding(false);
      responseTimerRef.current = null;
    }, 280);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim() && !responding) addExchange(draft.trim());
  };
  const runCriticalReview = () => {
    if (responding || reviewComplete) return;
    const seed = Date.now();
    setMessages((current) => [...current, { id: seed, role: 'user', text: CRITICAL_REVIEW_QUESTION }]);
    setDraft(''); setResponding(true);
    responseTimerRef.current = window.setTimeout(() => {
      setMessages((current) => [...current, {
        id: seed + 1,
        role: 'assistant',
        text: CRITICAL_REVIEW_RESPONSE,
        layers: [
          { label: 'Applicability', text: 'MDA provides a clear vocabulary for tracing relationships between designed rules, emergent play, and player experience.' },
          { label: 'Supporting evidence', text: 'The paper explicitly separates Mechanics, Dynamics, and Aesthetics and contrasts the designer’s and player’s perspectives.' },
          { label: 'Limitations', text: 'The framework is conceptual rather than an empirically validated method. Its linear presentation may underrepresent iteration, social play, culture, and narrative context.' },
          { label: 'Recommended adaptation', text: 'Use MDA to organise initial observations, then add qualitative player data and contextual analysis before drawing conclusions.' },
        ],
        source: { page: 2, kind: 'passage', label: 'Models, goals, and iterative refinement', searchTerm: 'models goals refinement', topPercent: 43, heightPercent: 38 },
      }]);
      setReviewComplete(true);
      setResponding(false);
      responseTimerRef.current = null;
    }, 280);
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
          ? <PaperViewer zoom={zoom} setZoom={setZoom} source={paperSource} location={paperLocation} />
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
          {screen === 'prompts' && <PromptPicker goal={goal} onChoose={(question, index) => addExchange(question, index)} />}
          {screen === 'conversation' && <Conversation messages={messages} refs={messageRefs} responding={responding}
            reviewComplete={reviewComplete} judgment={researchJudgment}
            onJudgment={setResearchJudgment} onCreateNote={() => setScreen('notes')}
            onFollowUp={(question, responseIndex) => addExchange(question, responseIndex)} onSource={setPaperLocation} />}
          {screen === 'notes' && <SessionNotes goal={goal} judgment={researchJudgment}
            onBack={() => setScreen(messages.length ? 'conversation' : paperLoaded ? 'goals' : 'landing')} />}
        </div>
        {screen !== 'notes' && <Composer draft={draft} setDraft={setDraft} onSubmit={submit} disabled={!paperLoaded || responding} />}
        {screen === 'conversation' && messages.some((message) => message.role === 'assistant') && !reviewComplete && (
          <button className="critical-review-launcher" onClick={runCriticalReview} disabled={responding}>
            <Search aria-hidden="true" />
            <span><strong>Critical review</strong><small>Evaluate applicability & limitations</small></span>
          </button>
        )}
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
      <IconButton label="Research-use note" onClick={onNotes}><NotebookPen /></IconButton>
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

function PaperViewer({ zoom, setZoom, source, location }: {
  zoom: number; setZoom: (value: number) => void; source: PaperSource | null; location: SourceLocation | null;
}) {
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    if (!source && location) pageRefs.current[location.page - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location, source]);
  if (source) return <div className="paper-viewer local-pdf-viewer">
    {location && <SourceLocationBanner location={location} />}
    <iframe key={`${source.url}-${location?.page || 1}-${location?.label || 'paper'}`} className="local-pdf-frame"
      src={`${source.url}#page=${location?.page || 1}&view=Fit${location ? `&search=${encodeURIComponent(location.searchTerm)}` : ''}`}
      title={`PDF preview: ${source.name}`} />
    {location && <span className={`local-source-highlight ${location.kind}`}
      style={{ top: `${10 + location.topPercent * .76}%`, height: `${Math.max(8, location.heightPercent * .76)}%` }}>
      <span>{location.kind === 'figure' ? 'Figure evidence' : 'Source passage'} · highlighted without changing the PDF</span>
    </span>}
  </div>;
  const nextZoom = zoom === 80 ? 100 : zoom === 100 ? 125 : 80;
  return <div className="paper-viewer">
    {location && <SourceLocationBanner location={location} />}
    <button className="zoom-button" onClick={() => setZoom(nextZoom)} title="Change zoom">{zoom}% <span>⌄</span></button>
    <div className="paper-scroll"><div className="paper-pages" style={{ width: `${zoom}%` }}>
      {[paperTop, paperBottom].map((page, index) => <div key={page}
        ref={(node) => { pageRefs.current[index] = node; }}
        className={`paper-page ${location?.page === index + 1 ? 'source-page-active' : ''}`}>
        <img src={page} alt={`${index === 0 ? 'First' : 'Second'} page of the MDA research paper`} />
        {location?.page === index + 1 && <span className={`source-highlight ${location.kind}`}
          style={{ top: `${location.topPercent}%`, height: `${location.heightPercent}%` }}>
          <span>{location.kind === 'figure' ? 'Figure' : 'Passage'} · {location.label}</span>
        </span>}
      </div>)}
    </div></div>
  </div>;
}

function SourceLocationBanner({ location }: { location: SourceLocation }) {
  return <div className="source-location-banner" role="status">
    Page {location.page} · {location.kind === 'figure' ? 'Figure' : 'Passage'} · {location.label}
  </div>;
}

function Welcome() { return <div className="welcome"><p>Hello, Hongshan!</p><p>Let’s start reading a paper :)</p></div>; }

function GoalPicker({ onChoose }: { onChoose: (goal: string) => void }) {
  const goals = [
    'Get a general overview of this paper',
    'Reproduce the study or method',
    RESEARCH_USE_GOAL,
    'Other — type a goal in the chat',
  ];
  return <div className="choice-screen"><h1>What would you like to learn?</h1><div className="choice-card">
    {goals.map((item) => <button key={item} onClick={() => onChoose(item)}>{item}</button>)}
  </div></div>;
}

function PromptPicker({ goal, onChoose }: { goal: string; onChoose: (question: string, index: number) => void }) {
  return <div className="prompt-screen">
    {goal === RESEARCH_USE_GOAL && <article className="goal-overview">
      <small>GOAL-SPECIFIC OVERVIEW</small>
      <h1>How might MDA support your research?</h1>
      <p>MDA may help structure a study of how game mechanics shape player behaviour and experience. Begin by understanding the framework, then examine its evidence, limits, and required adaptations before deciding whether to use it.</p>
    </article>}
    <h1>Choose a question to begin</h1><div className="prompt-grid">
    {prompts.slice(0, 3).map((item, index) => <button key={item} onClick={() => onChoose(item, index)}>{item}</button>)}
  </div></div>;
}

function Conversation({ messages, refs, responding, reviewComplete, judgment, onJudgment, onCreateNote, onFollowUp, onSource }: {
  messages: Message[];
  refs: RefObject<Array<HTMLDivElement | null>>;
  responding: boolean;
  reviewComplete: boolean;
  judgment: ResearchJudgment | null;
  onJudgment: (judgment: ResearchJudgment) => void;
  onCreateNote: () => void;
  onFollowUp: (question: string, responseIndex: number) => void;
  onSource: (source: SourceLocation) => void;
}) {
  let questionIndex = -1;
  const latestAssistantId = [...messages].reverse().find((message) => message.role === 'assistant')?.id;
  return <div className="conversation">{messages.map((message) => {
    if (message.role === 'user') questionIndex += 1;
    const current = questionIndex;
    return <div key={message.id} ref={(node) => { if (message.role === 'user') refs.current[current] = node; }} className={`message ${message.role}`}>
      <div className="message-copy">{message.text}</div>
      {message.role === 'assistant' && message.layers && <div className="answer-layers" aria-label="Expandable answer layers">
        {message.layers.map((layer) => <details key={layer.label}>
          <summary>{layer.label}<span aria-hidden="true">+</span></summary>
          <p>{layer.text}</p>
        </details>)}
      </div>}
      {message.source && <button className="source-link" onClick={() => onSource(message.source!)}>
        <span>SOURCE · PAGE {message.source.page}</span>
        <strong>{message.source.kind === 'figure' ? 'View figure' : 'View passage'}</strong>
        <span aria-hidden="true">→</span>
      </button>}
      {message.id === latestAssistantId && !responding && message.suggestions && <div className="follow-up-suggestions">
        <small>FOLLOW UP</small>
        <div>{message.suggestions.map((suggestion) => <button key={suggestion.text}
          onClick={() => onFollowUp(suggestion.text, suggestion.responseIndex)}>{suggestion.text}</button>)}</div>
      </div>}
    </div>;
  })}{responding && <div className="message assistant thinking"><span /><span /><span /></div>}
    {!responding && messages.some((message) => message.role === 'assistant') && <ResearchUseFlow
      reviewComplete={reviewComplete} judgment={judgment} onJudgment={onJudgment} onCreateNote={onCreateNote} />}
  </div>;
}

function ResearchUseFlow({ reviewComplete, judgment, onJudgment, onCreateNote }: {
  reviewComplete: boolean;
  judgment: ResearchJudgment | null;
  onJudgment: (judgment: ResearchJudgment) => void;
  onCreateNote: () => void;
}) {
  const options: ResearchJudgment[] = ['Use as proposed', 'Use with adaptations', 'Do not use', 'Need more evidence'];
  if (!reviewComplete) return null;

  return <section className="research-step judgment-step">
    <small>LEARNER JUDGMENT</small>
    <h2>How will you use this idea?</h2>
    <p>PaperLens has organised the evidence. The final research-use decision remains yours.</p>
    <div className="judgment-options">
      {options.map((option) => <button key={option} className={judgment === option ? 'selected' : ''}
        aria-pressed={judgment === option} onClick={() => onJudgment(option)}>{option}</button>)}
    </div>
    {judgment && <div className="judgment-confirmation">
      <span>Your decision: <strong>{judgment}</strong></span>
      <button onClick={onCreateNote}>Create research-use note <span aria-hidden="true">→</span></button>
    </div>}
  </section>;
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

function SessionNotes({ goal, judgment, onBack }: {
  goal: string; judgment: ResearchJudgment | null; onBack: () => void;
}) {
  return <div className="notes-page"><button className="back-link" onClick={onBack}><ChevronLeft /> Back to conversation</button>
    <div className="notes-heading"><div><span>RESEARCH-USE NOTE</span><h1>MDA framework</h1></div><NotebookPen /></div>
    <p className="notes-intro">A decision-focused record of the selected idea, its evidence, possible use, and unresolved uncertainty.</p>
    <div className="note-context">
      <small>READING GOAL</small>
      <p>{goal || 'No reading goal selected'}</p>
      <small>MY FINAL JUDGMENT</small>
      <p className={judgment ? 'judgment-recorded' : ''}>{judgment || 'Not decided yet — complete the critical review to record a decision.'}</p>
    </div>
    <h2>Selected idea</h2>
    <p className="selected-idea">Use Mechanics, Dynamics, and Aesthetics as an initial analytical scaffold for connecting designed rules with player behaviour and experience.</p>
    <h2>Evidence and research use</h2><div className="research-note-grid">
      <NoteCard title="Supporting evidence" text="The paper distinguishes Mechanics, Dynamics, and Aesthetics and explains that designers and players encounter these layers from opposite directions." />
      <NoteCard title="Possible use" text="Trace an observed player experience back through emergent behaviour to the game rules that may have produced it." />
      <NoteCard title="Required adaptations" text="Add qualitative player data and treat relationships between the three layers as iterative rather than strictly linear." />
      <NoteCard title="Limitations & uncertainties" text="MDA may underrepresent social, cultural, and narrative context, and the paper does not empirically validate it as a complete research method." />
      <NoteCard title="Next action" text="Compare MDA with another player-experience framework and decide which contextual factors need a separate coding scheme." />
    </div>
  </div>;
}

function NoteCard({ title, text }: { title: string; text: string }) { return <article><small>{title}</small><p>{text}</p></article>; }
