import { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Check,
} from 'lucide-react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  uploadDocument,
  confirmTransactions,
  type IngestResponse,
  type ParsedTransaction,
} from '../services/ingestApi';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BUSINESS_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

type PageStatus = 'idle' | 'uploading' | 'parsed' | 'confirming' | 'confirmed' | 'error';

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

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = ['Upload', 'Parsing', 'Review', 'Confirmed'] as const;

function stepIndex(status: PageStatus): number {
  if (status === 'idle') return 0;
  if (status === 'uploading') return 1;
  if (status === 'parsed' || status === 'confirming') return 2;
  if (status === 'confirmed') return 3;
  return 0;
}

function StepBar({ status }: { status: PageStatus }) {
  const active = stepIndex(status);
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={label} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors',
                current && 'text-[#003d9b] border-b-2 border-[#003d9b]',
                done && 'text-[#36B37E]',
                !current && !done && 'text-[#434654] opacity-50'
              )}
            >
              {done ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              {label}
            </div>
            {i < STEPS.length - 1 && (
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
  const [status, setStatus] = useState<PageStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [editedTransactions, setEditedTransactions] = useState<ParsedTransaction[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'inflow' | 'outflow' | 'flagged'>('all');
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────────────────

  function handleFileSelected(selected: File) {
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError(`Unsupported file type: ${selected.type}. Use PDF, JPG, or PNG.`);
      setStatus('error');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError('File is too large. Maximum size is 10 MB.');
      setStatus('error');
      return;
    }

    const previewUrl = URL.createObjectURL(selected);
    setFile(selected);
    setFilePreviewUrl(previewUrl);
    setError(null);
    setFilter('all');
    setStatus('uploading');

    uploadDocument(selected, BUSINESS_ID)
      .then((data) => {
        setResult(data);
        setEditedTransactions(data.transactions);
        setStatus('parsed');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unexpected error occurred.');
        setStatus('error');
      });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelected(selected);
    // Reset input so the same file can be re-selected after a reset
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

  function handleReset() {
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
      setError(e instanceof Error ? e.message : 'Failed to save transactions.');
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

  const isEdited = (realIndex: number): boolean => {
    if (!result) return false;
    const orig = result.transactions[realIndex];
    const edited = editedTransactions[realIndex];
    if (!orig || !edited) return false;
    return (
      orig.counterparty !== edited.counterparty ||
      orig.amount !== edited.amount ||
      orig.transaction_date !== edited.transaction_date
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1440px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start font-sans">
      {/* ── Left Column (40%) ── */}
      <section className="lg:col-span-5 flex flex-col gap-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#041b3c]">Document Intelligence</h1>
          <p className="text-[#434654] text-sm">Upload and automate data extraction for tax compliance.</p>
        </div>

        {/* Upload zone — idle only */}
        {status === 'idle' && (
          <div
            className="relative p-12 flex flex-col items-center justify-center text-center rounded-sm transition-all cursor-pointer group"
            style={{ backgroundColor: isDragOver ? '#e8edff' : '#f1f3ff' }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="absolute inset-0 border-2 border-dashed border-[#0052cc] opacity-50 rounded-sm pointer-events-none" />
            <div className="w-16 h-16 rounded-full bg-[#cdddff] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform z-10">
              <UploadCloud className="w-8 h-8 text-[#003d9b]" />
            </div>
            <h3 className="font-semibold text-[#041b3c] mb-1 z-10">Drag and drop invoice here</h3>
            <p className="text-sm text-[#434654] z-10">Support PDF, PNG, JPG (Max 10MB)</p>
            <button
              className="mt-4 px-4 py-2 bg-white text-[#003d9b] text-sm font-semibold rounded-sm shadow-sm hover:bg-[#f1f3ff] cursor-pointer transition-all z-10"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Browse Files
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Active Document panel — shown when file is loaded */}
        {file && status !== 'idle' && (
          <div className="bg-[#f1f3ff] rounded-sm p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#434654]">Active Document</span>
              {result && (
                <span className="px-2 py-0.5 bg-[#d6e3ff] text-[#003d9b] text-[10px] font-bold rounded-sm uppercase tracking-wide">
                  {docTypeLabel(result.document_type)}
                </span>
              )}
            </div>

            {/* File preview */}
            <div className="relative overflow-hidden rounded-sm bg-white border border-[#c3c6d6]/30 h-52 flex items-center justify-center">
              {filePreviewUrl && file.type.startsWith('image/') ? (
                <img
                  src={filePreviewUrl}
                  alt={file.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : filePreviewUrl && file.type === 'application/pdf' ? (
                <iframe
                  src={filePreviewUrl}
                  title={file.name}
                  className="w-full h-52"
                />
              ) : (
                <FileText className="w-12 h-12 text-[#003d9b] opacity-40" />
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#434654] shrink-0" />
                <span className="font-medium text-[#041b3c] truncate">{file.name}</span>
              </div>
              <span className="text-[#434654] shrink-0 ml-2">{fileSizeLabel(file.size)}</span>
            </div>

            {/* Success card under active doc */}
            {status === 'confirmed' && (
              <div className="bg-white rounded-sm p-4 flex items-center gap-3 border border-[#c3c6d6]/10">
                <CheckCircle2 className="w-5 h-5 text-[#36B37E] shrink-0" />
                <p className="text-sm font-bold text-[#36B37E]">
                  Added {confirmedCount} transaction{confirmedCount !== 1 ? 's' : ''} to ledger
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Right Column (60%) ── */}
      <section className="lg:col-span-7 bg-white rounded-sm overflow-hidden border border-[#c3c6d6]/10 shadow-[0_10px_40px_rgba(4,27,60,0.08)] flex flex-col min-h-[700px]">

        {/* Header */}
        <div className="p-6 border-b border-[#e8edff]">
          <StepBar status={status} />
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-xl font-bold tracking-tight text-[#041b3c]">
              {status === 'uploading' ? 'Parsing Document...' :
               status === 'confirmed' ? 'Transactions Confirmed' :
               'Parsed Results'}
            </h2>
            {(status === 'parsed' || status === 'confirming') && result && (
              <span className="text-sm font-semibold text-[#36B37E]">
                Extracted {result.transactions.length} transaction{result.transactions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {status === 'uploading' && (
            <p className="text-sm text-[#434654] mt-1">
              Gemini Flash is extracting transactions...
            </p>
          )}
        </div>

        {/* ── State: Idle ── */}
        {status === 'idle' && (
          <div className="flex-grow flex items-center justify-center p-10">
            <div className="text-center">
              <FileText className="w-12 h-12 text-[#434654] opacity-20 mx-auto mb-3" />
              <p className="text-sm text-[#434654]">Upload a document to see extracted transactions here.</p>
            </div>
          </div>
        )}

        {/* ── State: Uploading skeleton ── */}
        {status === 'uploading' && (
          <div className="flex-grow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#cdddff]">
                  {['Vendor', 'Amount (₹)', 'Date', 'Type', 'Status'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-[#f9f9ff]' : 'bg-[#f1f3ff]'}>
                    <td className="px-6 py-4"><div className="h-4 bg-[#f1f3ff] rounded-sm w-32 animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-[#f1f3ff] rounded-sm w-20 animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-[#f1f3ff] rounded-sm w-24 animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-[#f1f3ff] rounded-sm w-16 animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-[#f1f3ff] rounded-sm w-20 animate-pulse" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── State: Error ── */}
        {status === 'error' && (
          <div className="flex-grow flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-[#fff5f5] rounded-sm p-6 flex flex-col gap-4 shadow-[0_10px_40px_rgba(4,27,60,0.08)]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#FF5630] shrink-0" />
                <h3 className="font-semibold text-[#041b3c]">Something went wrong</h3>
              </div>
              <p className="text-sm text-[#FF5630]">{error}</p>
              <button
                className="self-start px-5 py-2 bg-[#e0e8ff] text-[#003d9b] text-sm font-semibold rounded-sm hover:brightness-95 transition-all cursor-pointer"
                onClick={handleReset}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ── State: Confirmed ── */}
        {status === 'confirmed' && (
          <div className="flex-grow flex flex-col items-center justify-center p-10 text-center gap-5">
            <CheckCircle2 className="w-16 h-16 text-[#36B37E]" />
            <h3 className="text-2xl font-bold tracking-tight text-[#041b3c]">
              {confirmedCount} transaction{confirmedCount !== 1 ? 's' : ''} added to ledger
            </h3>
            <p className="text-sm text-[#434654] max-w-sm">
              They are now visible in Obligations Ledger and will be included in runway calculations.
            </p>
            <button
              className="mt-2 px-6 py-2.5 bg-[#d7e2ff] text-[#003d9b] font-semibold text-sm rounded-sm hover:brightness-95 transition-all cursor-pointer"
              onClick={handleReset}
            >
              Upload Another Document
            </button>
          </div>
        )}

        {/* ── State: Parsed / Confirming — table ── */}
        {(status === 'parsed' || status === 'confirming') && result && (
          <>
            {/* Filter chips */}
            <div className="px-6 pt-4 pb-2 flex items-center gap-2 flex-wrap">
              {(['all', 'inflow', 'outflow', 'flagged'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-sm capitalize transition-colors',
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
                  className="ml-auto text-xs text-[#434654] hover:text-[#FF5630] font-medium transition-colors"
                >
                  Remove all flagged ({duplicateIndexSet.size})
                </button>
              )}
            </div>

            {/* Table */}
            <div className="flex-grow overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#cdddff]">
                    {['Vendor', 'Amount (₹)', 'Date', 'Type', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ tx, realIndex }) => {
                    const isDuplicate = duplicateIndexSet.has(realIndex);
                    const edited = isEdited(realIndex);
                    const rowBg = realIndex % 2 === 0 ? 'bg-[#f9f9ff]' : 'bg-[#f1f3ff]';

                    return (
                      <tr key={realIndex} className={cn(rowBg, 'hover:bg-[#e8edff] transition-colors')}>
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
                                className="border-b-2 border-[#003d9b] bg-[#f9f9ff] outline-none text-sm font-medium text-[#041b3c] w-full"
                                onBlur={(e) => commitEdit(realIndex, 'counterparty', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit(realIndex, 'counterparty', e.currentTarget.value);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                              />
                            ) : (
                              <span
                                className="text-sm font-semibold text-[#041b3c] hover:bg-[#f1f3ff] cursor-text rounded-sm px-1 py-0.5"
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
                              className="border-b-2 border-[#003d9b] bg-[#f9f9ff] outline-none text-sm font-medium text-[#041b3c] w-24"
                              onBlur={(e) => commitEdit(realIndex, 'amount', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit(realIndex, 'amount', e.currentTarget.value);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                            />
                          ) : (
                            <span
                              className="text-sm font-medium text-[#041b3c] hover:bg-[#f1f3ff] cursor-text rounded-sm px-1 py-0.5"
                              onClick={() => setEditingCell({ row: realIndex, field: 'amount' })}
                            >
                              {formatINR(tx.amount)}
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          {editingCell?.row === realIndex && editingCell.field === 'transaction_date' ? (
                            <input
                              autoFocus
                              type="date"
                              defaultValue={tx.transaction_date}
                              className="border-b-2 border-[#003d9b] bg-[#f9f9ff] outline-none text-sm font-medium text-[#041b3c]"
                              onBlur={(e) => commitEdit(realIndex, 'transaction_date', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit(realIndex, 'transaction_date', e.currentTarget.value);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                            />
                          ) : (
                            <span
                              className="text-sm text-[#434654] hover:bg-[#f1f3ff] cursor-text rounded-sm px-1 py-0.5"
                              onClick={() => setEditingCell({ row: realIndex, field: 'transaction_date' })}
                            >
                              {formatDate(tx.transaction_date)}
                            </span>
                          )}
                        </td>

                        {/* Type chip */}
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight"
                            style={{
                              backgroundColor: tx.transaction_type === 'inflow' ? '#ecfdf5' : '#fff1ee',
                              color: tx.transaction_type === 'inflow' ? '#36B37E' : '#FF5630',
                            }}
                          >
                            {tx.transaction_type === 'inflow' ? 'Inflow' : 'Outflow'}
                          </span>
                        </td>

                        {/* Status chip */}
                        <td className="px-4 py-3">
                          {isDuplicate ? (
                            <span
                              className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-amber-50 text-[#FFAB00] cursor-default"
                              title={duplicateReasonMap.get(realIndex)}
                            >
                              Possible Duplicate
                            </span>
                          ) : edited ? (
                            <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-purple-50 text-purple-600">
                              Edited
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-[#eef3ff] text-[#003d9b]">
                              AI Extracted
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <button
                            title="Remove row"
                            onClick={() =>
                              setEditedTransactions((prev) =>
                                prev.filter((_, i) => i !== realIndex)
                              )
                            }
                            className="text-[#434654] hover:text-[#FF5630] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-[#434654]">
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
          <div className="p-6 bg-[#f1f3ff] flex items-center justify-between flex-wrap gap-4 border-t border-[#c3c6d6]/10">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#434654]">Total Extracted</span>
                <span className="text-lg font-bold text-[#041b3c]">
                  {status === 'uploading' ? '—' : formatINR(totalAmount)}
                </span>
              </div>
              <div className="w-[1px] h-10 bg-[#c3c6d6]/30" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#434654]">Pending Review</span>
                <span className="text-lg font-bold text-[#FFAB00]">
                  {status === 'uploading' ? '—' : String(remainingFlags).padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="px-6 py-2.5 bg-[#d7e2ff] text-[#003d9b] font-semibold text-sm rounded-sm hover:brightness-95 active:scale-95 transition-all cursor-pointer"
                onClick={handleReset}
              >
                Cancel
              </button>
              {(status === 'parsed' || status === 'confirming') && (
                <button
                  disabled={editedTransactions.length === 0 || status === 'confirming'}
                  onClick={handleConfirm}
                  className={cn(
                    'px-6 py-2.5 font-semibold text-sm rounded-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer',
                    editedTransactions.length === 0 || status === 'confirming'
                      ? 'bg-[#c3d0f0] text-white cursor-not-allowed'
                      : 'bg-[#0052cc] text-white hover:bg-[#003d9b]'
                  )}
                >
                  <span>{status === 'confirming' ? 'Saving...' : 'Confirm & Add to Ledger'}</span>
                  {status !== 'confirming' && <ArrowRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
