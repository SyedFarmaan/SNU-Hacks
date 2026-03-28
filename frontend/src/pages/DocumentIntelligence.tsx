import { useRef, useState, useEffect } from 'react';
import { useBusinessContext } from '../context/BusinessContext';
import {
  UploadCloud,
  FileText,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Check,
  MessageSquare,
  Send,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  uploadDocument,
  confirmTransactions,
  parseChatMessage,
  type IngestResponse,
  type ParsedTransaction,
} from '../services/ingestApi';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

type ActiveTab = 'upload' | 'chat';
type PageStatus = 'idle' | 'uploading' | 'parsed' | 'confirming' | 'confirmed' | 'error';
type ErrorType =
  | 'file_type'
  | 'file_size'
  | 'parse_failed'
  | 'nlp_failed'
  | 'confirm_failed'
  | 'unknown';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isError?: boolean;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fileSizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function docTypeLabel(type: IngestResponse['document_type']): string {
  return { bank_statement: 'Bank Statement', invoice: 'Invoice', receipt: 'Receipt' }[type];
}

// ─── Step bar ────────────────────────────────────────────────────────────────

const UPLOAD_STEPS = ['Upload', 'Parsing', 'Review', 'Confirmed'] as const;
const CHAT_STEPS = ['Type', 'Processing', 'Review', 'Confirmed'] as const;

function stepIndex(status: PageStatus): number {
  if (status === 'idle') return 0;
  if (status === 'uploading') return 1;
  if (status === 'parsed' || status === 'confirming') return 2;
  if (status === 'confirmed') return 3;
  return 0;
}

function StepBar({ status, source }: { status: PageStatus; source: ActiveTab }) {
  const steps = source === 'chat' ? CHAT_STEPS : UPLOAD_STEPS;
  const active = stepIndex(status);
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={label} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                current && 'text-[#003d9b] border-b-2 border-[#003d9b]',
                done && 'text-[#36B37E]',
                !current && !done && 'text-[#434654] opacity-40'
              )}
            >
              {done ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              {label}
            </div>
            {i < steps.length - 1 && (
              <span className="text-[#c3c6d6] text-xs px-1">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DocumentIntelligence() {
  const { selectedBusiness } = useBusinessContext();
  const BUSINESS_ID = selectedBusiness?.id ?? '';

  // ── Tab + status ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');
  const [dataSource, setDataSource] = useState<ActiveTab>('upload');
  const [status, setStatus] = useState<PageStatus>('idle');

  // ── Upload state ──
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Shared result state ──
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [editedTransactions, setEditedTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>('unknown');
  const [filter, setFilter] = useState<'all' | 'inflow' | 'outflow' | 'flagged'>('all');
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);

  // ── Chat state ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // ── State reset ────────────────────────────────────────────────────────────

  function resetShared() {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFile(null);
    setFilePreviewUrl(null);
    setStatus('idle');
    setResult(null);
    setEditedTransactions([]);
    setError(null);
    setFilter('all');
    setEditingCell(null);
    setConfirmedCount(0);
    setChatLoading(false);
  }

  function handleReset() {
    resetShared();
    setChatMessages([]);
    setChatInput('');
  }

  function handleTabSwitch(tab: ActiveTab) {
    if (tab === activeTab) return;
    resetShared();
    setActiveTab(tab);
    setDataSource(tab);
  }

  // ── File handling ──────────────────────────────────────────────────────────

  function handleFileSelected(selected: File) {
    if (!ALLOWED_TYPES.includes(selected.type)) {
      const ext = selected.type.split('/')[1]?.toUpperCase() ?? selected.type;
      setError(
        `Unsupported file format "${ext}". Please upload a PDF, JPG, PNG, or WebP file.`
      );
      setErrorType('file_type');
      setStatus('error');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError(
        `File is too large (${fileSizeLabel(selected.size)}). Maximum allowed size is 10 MB.`
      );
      setErrorType('file_size');
      setStatus('error');
      return;
    }

    const previewUrl = URL.createObjectURL(selected);
    setFile(selected);
    setFilePreviewUrl(previewUrl);
    setError(null);
    setFilter('all');
    setDataSource('upload');
    setStatus('uploading');

    uploadDocument(selected, BUSINESS_ID)
      .then((data) => {
        setResult(data);
        setEditedTransactions(data.transactions);
        setStatus('parsed');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unexpected error occurred.';
        setError(msg);
        setErrorType(msg.toLowerCase().includes('status') ? 'parse_failed' : 'unknown');
        setStatus('error');
      });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelected(selected);
    e.target.value = '';
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileSelected(dropped);
  }

  // ── Chat handling ──────────────────────────────────────────────────────────

  async function handleChatSend() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    setDataSource('chat');
    setStatus('uploading');
    setResult(null);
    setEditedTransactions([]);
    setFilter('all');
    setError(null);

    try {
      const data = await parseChatMessage(text, BUSINESS_ID);
      const count = data.transactions.length;
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Extracted ${count} transaction${count !== 1 ? 's' : ''} from your message. Review and edit them in the table →`,
      };
      setChatMessages((prev) => [...prev, botMsg]);
      setResult(data);
      setEditedTransactions(data.transactions);
      setStatus('parsed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'NLP parsing failed. Please try again.';
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: msg,
        isError: true,
      };
      setChatMessages((prev) => [...prev, botMsg]);
      setError(msg);
      setErrorType('nlp_failed');
      setStatus('error');
    } finally {
      setChatLoading(false);
    }
  }

  // ── Inline editing ─────────────────────────────────────────────────────────

  function commitEdit(realIndex: number, field: keyof ParsedTransaction, value: string) {
    setEditedTransactions((prev) =>
      prev.map((t, i) => {
        if (i !== realIndex) return t;
        if (field === 'amount') return { ...t, amount: parseFloat(value) || t.amount };
        return { ...t, [field]: value };
      })
    );
    setEditingCell(null);
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!result || editedTransactions.length === 0) return;
    setStatus('confirming');
    try {
      const res = await confirmTransactions({
        business_id: BUSINESS_ID,
        document_type: result.document_type,
        transactions: editedTransactions,
        document_id: result.document_id,
      });
      setConfirmedCount(res.inserted_count);
      setStatus('confirmed');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save transactions.';
      setError(msg);
      setErrorType('confirm_failed');
      setStatus('error');
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const duplicateIndexSet = new Set(
    result?.duplicate_flags.map((f) => f.transaction_index) ?? []
  );
  const duplicateReasonMap = new Map(
    result?.duplicate_flags.map((f) => [f.transaction_index, f.match_reason]) ?? []
  );

  const filteredRows = editedTransactions
    .map((tx, realIndex) => ({ tx, realIndex }))
    .filter(({ tx, realIndex }) => {
      if (filter === 'inflow') return tx.transaction_type === 'inflow';
      if (filter === 'outflow') return tx.transaction_type === 'outflow';
      if (filter === 'flagged') return duplicateIndexSet.has(realIndex);
      return true;
    });

  const totalAmount = editedTransactions.reduce((s, t) => s + t.amount, 0);
  const remainingFlags = editedTransactions.filter((_, i) => duplicateIndexSet.has(i)).length;

  function isEdited(realIndex: number): boolean {
    if (!result) return false;
    const orig = result.transactions[realIndex];
    const edited = editedTransactions[realIndex];
    if (!orig || !edited) return false;
    return (
      orig.counterparty !== edited.counterparty ||
      orig.amount !== edited.amount ||
      orig.transaction_date !== edited.transaction_date ||
      orig.category !== edited.category
    );
  }

  // ── Granular retry actions ─────────────────────────────────────────────────

  function getRetryAction(): { label: string; action: () => void } {
    switch (errorType) {
      case 'file_type':
      case 'file_size':
        return {
          label: 'Choose Different File',
          action: () => { resetShared(); fileInputRef.current?.click(); },
        };
      case 'parse_failed':
        return { label: 'Reset & Re-upload', action: handleReset };
      case 'nlp_failed':
        return {
          label: 'Try Again in Chat',
          action: () => { setStatus('idle'); setError(null); },
        };
      case 'confirm_failed':
        return { label: 'Retry Confirmation', action: handleConfirm };
      default:
        return { label: 'Start Over', action: handleReset };
    }
  }

  const retryAction = status === 'error' ? getRetryAction() : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1440px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start font-sans">

      {/* ── Left Column ── */}
      <section className="lg:col-span-5 flex flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#041b3c]">Document Intelligence</h1>
          <p className="text-[#434654] text-sm">
            Upload a document for AI extraction, or log expenses directly via natural language.
          </p>
        </div>

        {/* ── Tabbed card ── */}
        <div className="bg-white rounded-sm border border-[#c3c6d6]/20 shadow-[0_4px_20px_rgba(4,27,60,0.07)] overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-[#e8edff]">
            {(['upload', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabSwitch(tab)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px flex-1 justify-center',
                  activeTab === tab
                    ? 'border-[#003d9b] text-[#003d9b] bg-[#f5f8ff]'
                    : 'border-transparent text-[#434654] hover:text-[#041b3c] hover:bg-[#f9f9ff]'
                )}
              >
                {tab === 'upload'
                  ? <UploadCloud className="w-4 h-4" />
                  : <MessageSquare className="w-4 h-4" />}
                {tab === 'upload' ? 'Document Upload' : 'Quick Chat Entry'}
              </button>
            ))}
          </div>

          {/* ── Upload tab content ── */}
          {activeTab === 'upload' && (
            <div className="p-4">
              {status === 'idle' ? (
                /* Drag-drop zone */
                <div
                  className={cn(
                    'relative p-10 flex flex-col items-center justify-center text-center rounded-sm cursor-pointer group transition-all duration-300',
                    isDragOver ? 'bg-[#dce9ff]' : 'bg-[#f1f3ff] hover:bg-[#e8edff]'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Static dashed border */}
                  <div
                    className={cn(
                      'absolute inset-0 border-2 border-dashed rounded-sm pointer-events-none transition-all duration-300',
                      isDragOver ? 'border-[#0052cc] opacity-100' : 'border-[#0052cc] opacity-40'
                    )}
                  />
                  {/* Aggressive pulsing glow overlay on drag */}
                  {isDragOver && (
                    <>
                      <div className="absolute inset-0 border-[3px] border-[#0052cc] rounded-sm pointer-events-none animate-pulse opacity-60" />
                      <div className="absolute inset-[-4px] border-2 border-[#0052cc]/30 rounded-sm pointer-events-none animate-ping" />
                    </>
                  )}
                  <div
                    className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center mb-4 z-10 transition-all duration-300',
                      isDragOver ? 'bg-[#a5c0ff] scale-110' : 'bg-[#cdddff] group-hover:scale-105'
                    )}
                  >
                    <UploadCloud
                      className={cn(
                        'w-7 h-7 transition-colors duration-200',
                        isDragOver ? 'text-[#001f6b]' : 'text-[#003d9b]'
                      )}
                    />
                  </div>
                  <h3 className="font-semibold text-[#041b3c] mb-1 z-10 transition-all duration-200">
                    {isDragOver ? 'Release to upload' : 'Drag and drop a document here'}
                  </h3>
                  <p className="text-xs text-[#434654] z-10">PDF, PNG, JPG, WebP · Max 10 MB</p>
                  {!isDragOver && (
                    <button
                      className="mt-4 px-4 py-2 bg-white text-[#003d9b] text-sm font-semibold rounded-sm shadow-sm hover:bg-[#e8edff] cursor-pointer transition-all z-10 active:scale-95"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      Browse Files
                    </button>
                  )}
                </div>
              ) : (
                /* Active document panel */
                file && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#434654]">
                        Active Document
                      </span>
                      {result && (
                        <span className="px-2 py-0.5 bg-[#d6e3ff] text-[#003d9b] text-[10px] font-bold rounded-sm uppercase tracking-wide">
                          {docTypeLabel(result.document_type)}
                        </span>
                      )}
                    </div>
                    <div className="relative overflow-hidden rounded-sm bg-[#f9f9ff] border border-[#c3c6d6]/20 h-44 flex items-center justify-center">
                      {filePreviewUrl && file.type.startsWith('image/') ? (
                        <img
                          src={filePreviewUrl}
                          alt={file.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : filePreviewUrl && file.type === 'application/pdf' ? (
                        <iframe src={filePreviewUrl} title={file.name} className="w-full h-44" />
                      ) : (
                        <FileText className="w-10 h-10 text-[#003d9b] opacity-40" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#434654] shrink-0" />
                        <span className="font-medium text-[#041b3c] truncate">{file.name}</span>
                      </div>
                      <span className="text-[#434654] shrink-0 ml-2">{fileSizeLabel(file.size)}</span>
                    </div>
                    {status === 'confirmed' && (
                      <div className="bg-[#f0faf5] rounded-sm p-3 flex items-center gap-2.5 border border-[#36B37E]/20 transition-all duration-300">
                        <CheckCircle2 className="w-4 h-4 text-[#36B37E] shrink-0" />
                        <p className="text-sm font-bold text-[#36B37E]">
                          Added {confirmedCount} transaction{confirmedCount !== 1 ? 's' : ''} to ledger
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── Chat tab content ── */}
          {activeTab === 'chat' && (
            <div className="flex flex-col" style={{ height: '320px' }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#f9f9ff]">
                {chatMessages.length === 0 && !chatLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-4">
                    <div className="w-10 h-10 rounded-full bg-[#cdddff] flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-[#003d9b]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#041b3c]">Quick Chat Entry</p>
                      <p className="text-xs text-[#434654] mt-1 max-w-[220px] leading-relaxed">
                        Type a natural language expense, e.g.<br />
                        <span className="text-[#003d9b] font-medium">
                          "Paid ₹500 for supplies to Amazon yesterday"
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2 transition-all duration-200',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-[#cdddff] flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-[#003d9b]" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed',
                          msg.role === 'user'
                            ? 'bg-[#003d9b] text-white rounded-br-sm'
                            : msg.isError
                              ? 'bg-[#fff5f5] text-[#FF5630] border border-[#FF5630]/20 rounded-bl-sm'
                              : 'bg-white text-[#041b3c] border border-[#e8edff] shadow-sm rounded-bl-sm'
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}

                {/* Loading indicator */}
                {chatLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-[#cdddff] flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-[#003d9b]" />
                    </div>
                    <div className="bg-white border border-[#e8edff] shadow-sm rounded-lg rounded-bl-sm px-4 py-2.5 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span
                          className="w-1.5 h-1.5 bg-[#0052cc] rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-[#0052cc] rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-[#0052cc] rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                      <span className="text-xs text-[#434654]">Processing NLP...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              <div className="p-3 bg-white border-t border-[#e8edff] flex gap-2 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) handleChatSend();
                  }}
                  placeholder="e.g. Paid ₹2,000 for AWS subscription last Friday..."
                  disabled={chatLoading}
                  className="flex-1 bg-[#f9f9ff] border border-[#e8edff] rounded-sm px-3 py-2 text-sm text-[#041b3c] placeholder:text-[#c3c6d6] outline-none focus:border-[#003d9b] transition-colors duration-150 disabled:opacity-50"
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatLoading}
                  className={cn(
                    'px-3 py-2 rounded-sm transition-all duration-150 flex items-center justify-center',
                    chatInput.trim() && !chatLoading
                      ? 'bg-[#0052cc] text-white hover:bg-[#003d9b] active:scale-95 cursor-pointer'
                      : 'bg-[#e0e8ff] text-[#003d9b] opacity-50 cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Right Column ── */}
      <section className="lg:col-span-7 bg-white rounded-sm overflow-hidden border border-[#c3c6d6]/10 shadow-[0_10px_40px_rgba(4,27,60,0.08)] flex flex-col min-h-[700px]">

        {/* Header */}
        <div className="p-6 border-b border-[#e8edff]">
          <StepBar status={status} source={dataSource} />
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-xl font-bold tracking-tight text-[#041b3c] transition-all duration-200">
              {status === 'uploading'
                ? dataSource === 'chat' ? 'Processing Natural Language...' : 'Parsing Document...'
                : status === 'confirmed' ? 'Transactions Confirmed'
                : 'Parsed Results'}
            </h2>
            {(status === 'parsed' || status === 'confirming') && result && (
              <span className="text-sm font-semibold text-[#36B37E]">
                Extracted {result.transactions.length} transaction{result.transactions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {status === 'uploading' && (
            <p className="text-sm text-[#434654] mt-1">
              {dataSource === 'chat'
                ? 'NLP engine is extracting entities and amounts...'
                : 'The system is extracting transactions from your document...'}
            </p>
          )}
        </div>

        {/* ── State: Idle ── */}
        {status === 'idle' && (
          <div className="flex-grow flex items-center justify-center p-10">
            <div className="text-center">
              <FileText className="w-12 h-12 text-[#434654] opacity-20 mx-auto mb-3" />
              <p className="text-sm text-[#434654]">
                {activeTab === 'chat'
                  ? 'Type an expense in the chat to see extracted transactions here.'
                  : 'Upload a document to see extracted transactions here.'}
              </p>
            </div>
          </div>
        )}

        {/* ── State: Uploading — skeleton ── */}
        {status === 'uploading' && (
          <div className="flex-grow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#cdddff]">
                  {['Vendor', 'Amount (₹)', 'Date', 'Category', 'Type', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-[#f9f9ff]' : 'bg-white'}>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-[#e8edff] rounded-sm w-28 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-[#e8edff] rounded-sm w-20 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-[#e8edff] rounded-sm w-24 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-[#e8edff] rounded-sm w-20 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-[#e8edff] rounded-sm w-16 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-[#e8edff] rounded-sm w-20 animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── State: Error ── */}
        {status === 'error' && (
          <div className="flex-grow flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-[#fff8f8] rounded-sm p-6 flex flex-col gap-4 border border-[#FF5630]/10 shadow-[0_4px_20px_rgba(255,86,48,0.07)]">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-sm bg-[#ffe8e3] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#FF5630]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#041b3c] text-sm">
                    {errorType === 'file_type' ? 'Unsupported File Format'
                      : errorType === 'file_size' ? 'File Too Large'
                      : errorType === 'parse_failed' ? 'Document Parsing Failed'
                      : errorType === 'nlp_failed' ? 'NLP Processing Failed'
                      : errorType === 'confirm_failed' ? 'Ledger Save Failed'
                      : 'Something Went Wrong'}
                  </h3>
                  <p className="text-sm text-[#FF5630] mt-1 break-words">{error}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1 flex-wrap">
                {retryAction && (
                  <button
                    onClick={retryAction.action}
                    className="px-4 py-2 bg-[#003d9b] text-white text-sm font-semibold rounded-sm hover:bg-[#001f6b] transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {retryAction.label}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-[#e0e8ff] text-[#003d9b] text-sm font-semibold rounded-sm hover:brightness-95 transition-all cursor-pointer"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── State: Confirmed ── */}
        {status === 'confirmed' && (
          <div className="flex-grow flex flex-col items-center justify-center p-10 text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-[#36B37E]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-[#041b3c]">
                {confirmedCount} transaction{confirmedCount !== 1 ? 's' : ''} added to ledger
              </h3>
              <p className="text-sm text-[#434654] max-w-sm mt-2 mx-auto">
                They are now visible in Obligations Ledger and will be included in runway calculations.
              </p>
            </div>
            <button
              className="mt-2 px-6 py-2.5 bg-[#d7e2ff] text-[#003d9b] font-semibold text-sm rounded-sm hover:brightness-95 transition-all cursor-pointer active:scale-95"
              onClick={handleReset}
            >
              {activeTab === 'chat' ? 'Log Another Expense' : 'Upload Another Document'}
            </button>
          </div>
        )}

        {/* ── State: Parsed / Confirming — interactive table ── */}
        {(status === 'parsed' || status === 'confirming') && result && (
          <>
            {/* Filter chips */}
            <div className="px-6 pt-4 pb-2 flex items-center gap-2 flex-wrap">
              {(['all', 'inflow', 'outflow', 'flagged'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-sm capitalize transition-colors duration-150',
                    filter === f
                      ? 'bg-[#003d9b] text-white'
                      : 'bg-[#d6e3ff] text-[#041b3c] hover:bg-[#c3d0f0]'
                  )}
                >
                  {f === 'flagged'
                    ? `Flagged (${duplicateIndexSet.size})`
                    : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {filter === 'flagged' && duplicateIndexSet.size > 0 && (
                <button
                  onClick={() =>
                    setEditedTransactions((prev) =>
                      prev.filter((_, i) => !duplicateIndexSet.has(i))
                    )
                  }
                  className="ml-auto text-xs text-[#434654] hover:text-[#FF5630] font-medium transition-colors cursor-pointer"
                >
                  Remove all flagged ({duplicateIndexSet.size})
                </button>
              )}
            </div>

            {/* Table */}
            <div className="flex-grow overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#cdddff] sticky top-0">
                    {['Vendor', 'Amount (₹)', 'Date', 'Category', 'Type', 'Status', ''].map((h, i) => (
                      <th
                        key={i}
                        className="px-4 py-3.5 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ tx, realIndex }) => {
                    const isDuplicate = duplicateIndexSet.has(realIndex);
                    const edited = isEdited(realIndex);
                    const rowBg = realIndex % 2 === 0 ? 'bg-[#f9f9ff]' : 'bg-white';

                    return (
                      <tr
                        key={realIndex}
                        className={cn(rowBg, 'hover:bg-[#e8edff] transition-colors duration-150 group')}
                      >
                        {/* Vendor */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-sm bg-[#e8edff] flex items-center justify-center font-bold text-[#003d9b] text-[10px] shrink-0">
                              {getInitials(tx.counterparty)}
                            </div>
                            {editingCell?.row === realIndex && editingCell.field === 'counterparty' ? (
                              <input
                                autoFocus
                                type="text"
                                defaultValue={tx.counterparty}
                                className="border-b-2 border-[#003d9b] bg-transparent outline-none text-sm font-medium text-[#041b3c] w-full transition-colors"
                                onBlur={(e) => commitEdit(realIndex, 'counterparty', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter')
                                    commitEdit(realIndex, 'counterparty', e.currentTarget.value);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                              />
                            ) : (
                              <span
                                title="Click to edit"
                                className="text-sm font-semibold text-[#041b3c] cursor-text rounded-sm px-1 py-0.5 hover:bg-[#e0e8ff] transition-colors duration-100"
                                onClick={() => setEditingCell({ row: realIndex, field: 'counterparty' })}
                              >
                                {tx.counterparty}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3">
                          {editingCell?.row === realIndex && editingCell.field === 'amount' ? (
                            <input
                              autoFocus
                              type="number"
                              step="0.01"
                              defaultValue={tx.amount}
                              className="border-b-2 border-[#003d9b] bg-transparent outline-none text-sm font-medium text-[#041b3c] w-24 transition-colors"
                              onBlur={(e) => commitEdit(realIndex, 'amount', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  commitEdit(realIndex, 'amount', e.currentTarget.value);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                            />
                          ) : (
                            <span
                              title="Click to edit"
                              className="text-sm font-medium text-[#041b3c] cursor-text rounded-sm px-1 py-0.5 hover:bg-[#e0e8ff] transition-colors duration-100"
                              onClick={() => setEditingCell({ row: realIndex, field: 'amount' })}
                            >
                              {formatINR(tx.amount)}
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          {editingCell?.row === realIndex &&
                          editingCell.field === 'transaction_date' ? (
                            <input
                              autoFocus
                              type="date"
                              defaultValue={tx.transaction_date}
                              className="border-b-2 border-[#003d9b] bg-transparent outline-none text-sm text-[#041b3c] transition-colors"
                              onBlur={(e) =>
                                commitEdit(realIndex, 'transaction_date', e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  commitEdit(
                                    realIndex,
                                    'transaction_date',
                                    e.currentTarget.value
                                  );
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                            />
                          ) : (
                            <span
                              title="Click to edit"
                              className="text-sm text-[#434654] cursor-text rounded-sm px-1 py-0.5 hover:bg-[#e0e8ff] transition-colors duration-100"
                              onClick={() =>
                                setEditingCell({ row: realIndex, field: 'transaction_date' })
                              }
                            >
                              {formatDate(tx.transaction_date)}
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          <select
                            value={tx.category || 'misc'}
                            onChange={(e) => commitEdit(realIndex, 'category', e.target.value)}
                            className="text-[10px] font-bold uppercase tracking-tight bg-[#eef3ff] text-[#003d9b] border-none rounded-sm px-2 py-1 cursor-pointer focus:ring-1 focus:ring-[#003d9b] focus:outline-none"
                          >
                            {['rent','loan_emi','utility','tax','supplier_invoice','contractor','marketing','subscription','misc'].map(c => (
                              <option key={c} value={c}>{c.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight"
                            style={{
                              backgroundColor:
                                tx.transaction_type === 'inflow' ? '#ecfdf5' : '#fff1ee',
                              color:
                                tx.transaction_type === 'inflow' ? '#36B37E' : '#FF5630',
                            }}
                          >
                            {tx.transaction_type === 'inflow' ? 'Inflow' : 'Outflow'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {isDuplicate ? (
                            <span
                              title={duplicateReasonMap.get(realIndex)}
                              className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-amber-50 text-[#FFAB00] cursor-default"
                            >
                              Possible Duplicate
                            </span>
                          ) : edited ? (
                            <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-purple-50 text-purple-600">
                              Edited
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-[#eef3ff] text-[#003d9b]">
                              {dataSource === 'chat' ? 'NLP Extracted' : 'AI Extracted'}
                            </span>
                          )}
                        </td>

                        {/* Remove */}
                        <td className="px-4 py-3">
                          <button
                            title="Remove row"
                            onClick={() =>
                              setEditedTransactions((prev) =>
                                prev.filter((_, i) => i !== realIndex)
                              )
                            }
                            className="text-[#c3c6d6] hover:text-[#FF5630] transition-colors duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-[#434654]">
                        No transactions match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Footer ── */}
        {status !== 'idle' && status !== 'error' && status !== 'confirmed' && (
          <div className="p-5 bg-[#f1f3ff] flex items-center justify-between flex-wrap gap-4 border-t border-[#c3c6d6]/10">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#434654]">
                  Total Extracted
                </span>
                <span className="text-lg font-bold text-[#041b3c]">
                  {status === 'uploading' ? '—' : formatINR(totalAmount)}
                </span>
              </div>
              <div className="w-px h-10 bg-[#c3c6d6]/30" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#434654]">
                  Pending Review
                </span>
                <span className="text-lg font-bold text-[#FFAB00]">
                  {status === 'uploading' ? '—' : String(remainingFlags).padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 bg-white text-[#434654] font-semibold text-sm rounded-sm border border-[#c3c6d6]/30 hover:border-[#003d9b]/40 hover:text-[#003d9b] transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
              {(status === 'parsed' || status === 'confirming') && (
                <button
                  disabled={editedTransactions.length === 0 || status === 'confirming'}
                  onClick={handleConfirm}
                  className={cn(
                    'px-6 py-2.5 font-semibold text-sm rounded-sm transition-all duration-150 active:scale-95 flex items-center gap-2',
                    editedTransactions.length === 0 || status === 'confirming'
                      ? 'bg-[#c3d0f0] text-white cursor-not-allowed'
                      : 'bg-[#0052cc] text-white hover:bg-[#003d9b] cursor-pointer'
                  )}
                >
                  <span>
                    {status === 'confirming' ? 'Saving...' : 'Confirm & Add to Ledger'}
                  </span>
                  {status !== 'confirming' && <ArrowRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
