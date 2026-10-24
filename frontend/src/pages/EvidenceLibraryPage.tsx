import React, { useState, useEffect } from 'react';
import {
  Library,
  Search,
  Filter,
  Bookmark,
  FileText,
  Copy,
  Check,
  Tag,
  Clock,
  ShieldCheck,
  AlertTriangle,
  History,
} from 'lucide-react';
import { EvidenceChunkItem } from '../types/api';
import { api } from '../lib/api';

export const EvidenceLibraryPage: React.FC = () => {
  const [chunks, setChunks] = useState<EvidenceChunkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedVersion, setSelectedVersion] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const data = await api.getEvidence({
        search: searchTerm || undefined,
        document_type: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        version: selectedVersion !== 'ALL' ? selectedVersion : undefined,
      });
      setChunks(data);
    } catch (err) {
      console.error('Failed to load evidence library', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [searchTerm, selectedCategory, selectedVersion]);

  const handleCopy = (chunk: EvidenceChunkItem) => {
    navigator.clipboard.writeText(chunk.text);
    setCopiedId(chunk.chunk_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-ink-950 to-slate-900 border border-ink-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-brand-primary/20 text-cyan-300 border border-brand-primary/30 mb-2">
              <Library className="w-3.5 h-3.5" />
              <span>Configured Corporate Knowledge Base</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
              Evidence Library & Provenance Catalog
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Search and inspect immutable document chunks, metadata, canonical policy facts, and real citation counts across audits.
            </p>
          </div>

          <div className="bg-amber-950/60 border border-amber-800/80 rounded-xl p-3 text-2xs text-amber-200 max-w-xs">
            <span className="font-bold flex items-center gap-1 mb-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Fictional Demo Policy Corpus
            </span>
            All Acme Corp policies provided in this demo are synthetic and configured solely for verification benchmarking.
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search passage text, section, or chunk ID..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-ink-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-ink-900 border border-slate-700 rounded-lg text-slate-200 font-sans"
            >
              <option value="ALL">All Categories</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Workplace Policy">Workplace Policy</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-ink-900 border border-slate-700 rounded-lg text-slate-200 font-sans"
            >
              <option value="ALL">All Versions</option>
              <option value="1.0">v1.0 (Current Canonical 2026)</option>
              <option value="0.9">v0.9 (Archived Historical 2025)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Version Drift Preview Notice */}
      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl flex items-start gap-3">
        <Clock className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
        <div className="text-xs text-purple-950">
          <span className="font-bold">Feature D: Evidence Version Drift & Conflict Preview: </span>
          Notice that <span className="font-mono font-semibold">DOC-HR-2025-ARCHIVE (v0.9)</span> specified 12 days paid leave, while current <span className="font-mono font-semibold">DOC-HR-2026 (v1.0)</span> specifies 14 days. GroundCheck detects version changes to canonical policy benchmarks and prioritizes active canonical records over superseded archives.
        </div>
      </div>

      {/* Chunks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-slate-400 text-xs">
            Loading evidence passages...
          </div>
        ) : chunks.length > 0 ? (
          chunks.map((chk) => (
            <div
              key={chk.chunk_id}
              className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-sm">
                      {chk.chunk_id}
                    </span>
                    <span
                      className={`text-3xs uppercase font-bold px-1.5 py-0.5 rounded-sm border ${
                        chk.is_canonical
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {chk.is_canonical ? 'CANONICAL' : 'ARCHIVED / SUPERSEDED'}
                    </span>
                  </div>

                  <span className="text-2xs font-mono font-medium text-slate-400">
                    v{chk.version}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-700 mb-1">
                  {chk.document_name}
                </div>
                <div className="text-2xs text-cyan-700 font-medium mb-3">
                  {chk.section}
                </div>

                {/* Exact Text */}
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono leading-relaxed mb-4">
                  "{chk.text}"
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm font-medium">
                    {chk.policy_category}
                  </span>
                  <span>Citations: <strong className="font-mono text-slate-800">{chk.references_count}</strong></span>
                </div>

                <button
                  onClick={() => handleCopy(chk)}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {copiedId === chk.chunk_id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === chk.chunk_id ? 'Copied' : 'Copy Passage'}</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12 text-slate-400 text-xs">
            No matching evidence passages found in the library.
          </div>
        )}
      </div>
    </div>
  );
};
