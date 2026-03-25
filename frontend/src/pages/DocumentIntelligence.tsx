import { useRef, useState } from 'react';
import { UploadCloud, FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import {
  uploadDocument,
  type IngestResponse,
} from '../services/ingestApi';

const BUSINESS_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

type Status = 'idle' | 'uploading' | 'parsed' | 'error';

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
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
  const map: Record<IngestResponse['document_type'], string> = {
    bank_statement: 'Bank Statement',
    invoice: 'Invoice',
    receipt: 'Receipt',
  };
  return map[type];
}

export default function DocumentIntelligence() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(selected: File) {
    setFile(selected);
    setStatus('uploading');
    setResult(null);
    setError(null);
    try {
      const data = await uploadDocument(selected, BUSINESS_ID);
      setResult(data);
      setStatus('parsed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.');
      setStatus('error');
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
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
    if (dropped) handleFile(dropped);
  }

  function handleReset() {
    setFile(null);
    setStatus('idle');
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const duplicateIndexSet = new Set(
    result?.duplicate_flags.map((f) => f.transaction_index) ?? []
  );
  const duplicateReasonMap = new Map(
    result?.duplicate_flags.map((f) => [f.transaction_index, f.match_reason]) ?? []
  );

  const totalAmount = result?.transactions.reduce((sum, tx) => sum + tx.amount, 0) ?? 0;
  const reviewCount = result?.duplicate_flags.length ?? 0;

  return (
    <div className="max-w-[1440px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start animate-in fade-in duration-500">
      {/* Left Column (40%) */}
      <section className="lg:col-span-5 flex flex-col gap-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#041b3c]">Document Intelligence</h1>
          <p className="text-[#434654] text-sm">Upload and automate data extraction for tax compliance.</p>
        </div>

        {/* Upload Zone — shown when idle */}
        {status === 'idle' && (
          <div
            className="relative p-12 flex flex-col items-center justify-center text-center rounded-sm transition-all cursor-pointer group"
            style={{ backgroundColor: isDragOver ? '#e8edff' : '#f1f3ff' }}
            onClick={() => inputRef.current?.click()}
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
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              Browse Files
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* Uploading zone replacement */}
        {status === 'uploading' && (
          <div className="bg-[#f1f3ff] p-12 flex flex-col items-center justify-center text-center rounded-sm">
            <div className="w-16 h-16 rounded-full bg-[#cdddff] flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8 text-[#003d9b] animate-pulse" />
            </div>
            <h3 className="font-semibold text-[#041b3c] mb-1">Uploading...</h3>
            <p className="text-sm text-[#434654]">{file?.name}</p>
          </div>
        )}

        {/* Parsed / Error: show idle zone again for re-upload */}
        {(status === 'parsed' || status === 'error') && (
          <div
            className="relative p-8 flex flex-col items-center justify-center text-center rounded-sm transition-all cursor-pointer group bg-[#f1f3ff]"
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ backgroundColor: isDragOver ? '#e8edff' : '#f1f3ff' }}
          >
            <div className="absolute inset-0 border-2 border-dashed border-[#0052cc] opacity-30 rounded-sm pointer-events-none" />
            <p className="text-sm text-[#434654] z-10">Drop another file or click to replace</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* Active Document Panel */}
        <div className="bg-[#f1f3ff] rounded-sm p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#434654]">Active Document</span>
          </div>
          <div className="relative overflow-hidden rounded-sm bg-white border border-[#c3c6d6]/30 h-40 flex items-center justify-center">
            {file ? (
              <div className="flex flex-col items-center gap-2 p-4">
                <FileText className="w-12 h-12 text-[#003d9b] opacity-60" />
                <span className="text-xs text-[#434654] text-center break-all">{file.name}</span>
              </div>
            ) : (
              <span className="text-sm text-[#434654] opacity-50">No document loaded</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#434654]" />
              <span className="font-medium text-[#041b3c]">
                {file ? file.name : '—'}
              </span>
            </div>
            <span className="text-[#434654]">
              {file ? formatFileSize(file.size) : ''}
            </span>
          </div>
        </div>
      </section>

      {/* Right Column (60%) */}
      <section className="lg:col-span-7 bg-white rounded-sm overflow-hidden border border-[#c3c6d6]/10 shadow-[0_10px_40px_rgba(4,27,60,0.08)] flex flex-col min-h-[700px]">
        {/* Header */}
        <div className="p-6 border-b border-[#e8edff] flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-[#041b3c]">Parsed Results</h2>
            {status === 'parsed' && result && (
              <span className="px-2 py-0.5 bg-[#d6e3ff] text-[#003d9b] text-xs font-semibold rounded-sm uppercase tracking-wide">
                {docTypeLabel(result.document_type)}
              </span>
            )}
          </div>
          {status === 'parsed' && result && (
            <span className="text-sm font-semibold text-[#36B37E]">
              Extracted {result.transactions.length} transaction{result.transactions.length !== 1 ? 's' : ''}
            </span>
          )}
          {status !== 'parsed' && status !== 'uploading' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#434654]">Confidence Score:</span>
              <div className="w-16 bg-[#e8edff] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#36B37E] h-full w-0" />
              </div>
              <span className="text-xs font-bold text-[#434654]">—</span>
            </div>
          )}
        </div>

        {/* States: Uploading skeleton */}
        {status === 'uploading' && (
          <div className="flex-grow p-6 flex flex-col gap-4">
            <p className="text-sm text-[#434654]">Parsing document with Gemini Flash...</p>
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-sm bg-[#f1f3ff]" />
                  <div className="flex-1 h-4 rounded-sm bg-[#f1f3ff]" />
                  <div className="w-24 h-4 rounded-sm bg-[#f1f3ff]" />
                  <div className="w-20 h-4 rounded-sm bg-[#f1f3ff]" />
                  <div className="w-16 h-4 rounded-sm bg-[#f1f3ff]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State: Idle */}
        {status === 'idle' && (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center p-10">
              <FileText className="w-12 h-12 text-[#434654] opacity-20 mx-auto mb-3" />
              <p className="text-sm text-[#434654]">Upload a document to see extracted transactions here.</p>
            </div>
          </div>
        )}

        {/* State: Error */}
        {status === 'error' && (
          <div className="flex-grow flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-[#fff5f5] rounded-sm p-6 flex flex-col gap-4 shadow-[0_10px_40px_rgba(4,27,60,0.08)]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#FF5630] shrink-0" />
                <h3 className="font-semibold text-[#041b3c]">Parsing Failed</h3>
              </div>
              <p className="text-sm text-[#434654]">{error}</p>
              <button
                className="self-start px-5 py-2 bg-[#e0e8ff] text-[#003d9b] text-sm font-semibold rounded-sm hover:brightness-95 transition-all cursor-pointer"
                onClick={handleReset}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* State: Parsed — Data Table */}
        {status === 'parsed' && result && (
          <div className="flex-grow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#cdddff]">
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Amount (₹)</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.transactions.map((tx, idx) => {
                  const isDuplicate = duplicateIndexSet.has(idx);
                  const reason = duplicateReasonMap.get(idx);
                  const rowBg = idx % 2 === 0 ? 'bg-[#f9f9ff]' : 'bg-[#f1f3ff]';
                  return (
                    <tr key={idx} className={`${rowBg} hover:bg-[#e8edff] transition-colors`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-sm bg-[#e8edff] flex items-center justify-center font-bold text-[#003d9b] text-xs shrink-0">
                            {getInitials(tx.counterparty)}
                          </div>
                          <span className="text-sm font-semibold text-[#041b3c]">{tx.counterparty}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-[#041b3c]">{formatINR(tx.amount)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#434654]">{formatDate(tx.transaction_date)}</td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight"
                          style={{
                            backgroundColor: tx.transaction_type === 'inflow' ? '#e6f7f1' : '#fff0ec',
                            color: tx.transaction_type === 'inflow' ? '#36B37E' : '#FF5630',
                          }}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isDuplicate ? (
                          <div className="relative group/tooltip inline-block">
                            <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-amber-50 text-[#FFAB00] cursor-default">
                              Possible Duplicate
                            </span>
                            {reason && (
                              <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1d3052] text-white text-xs rounded-sm px-3 py-2 shadow-[0_10px_40px_rgba(4,27,60,0.08)] hidden group-hover/tooltip:block z-20 leading-relaxed">
                                {reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-purple-100 text-purple-700">
                            AI Extracted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-[#f1f3ff] flex items-center justify-between border-t border-[#c3c6d6]/10 flex-wrap gap-4">
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#434654]">Total Extracted</span>
              <span className="text-lg font-bold text-[#041b3c]">
                {status === 'parsed' ? formatINR(totalAmount) : '—'}
              </span>
            </div>
            <div className="w-[1px] h-10 bg-[#c3c6d6]/30" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#434654]">Pending Review</span>
              <span className="text-lg font-bold text-[#FFAB00]">
                {status === 'parsed' ? String(reviewCount).padStart(2, '0') : '—'}
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
            {status === 'parsed' && (
              <button className="px-6 py-2.5 bg-[#0052cc] text-white font-semibold text-sm rounded-sm hover:bg-[#003d9b] transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
                <span>Confirm &amp; Add to Ledger</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
