import React, { useState, useEffect, useRef } from 'react';
import api from '../config/api';

interface LedgerListProps {
  onEdit: (id: string) => void;
  onBack: () => void;
}

export const LedgerList: React.FC<LedgerListProps> = ({ onEdit, onBack }) => {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const fetchLedgers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ledgers');
      setLedgers(res.data);
    } catch (err) {
      setError('Failed to fetch ledgers list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const filteredLedgers = ledgers.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.type.toLowerCase().includes(search.toLowerCase()) ||
    l.group.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Keyboard navigation inside list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredLedgers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredLedgers.length) % filteredLedgers.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeLedger = filteredLedgers[selectedIndex];
        if (activeLedger) {
          onEdit(activeLedger.id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredLedgers, selectedIndex, onEdit, onBack]);

  // Adjust scroll when selected index changes
  useEffect(() => {
    if (listContainerRef.current) {
      const activeEl = listContainerRef.current.querySelector('.selected-row') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ledger '${name}'?`)) return;
    try {
      await api.delete(`/ledgers/${id}`);
      fetchLedgers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete ledger');
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-5 font-mono max-w-3xl mx-auto flex flex-col max-h-[500px]">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-4">
        <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-wide">
          LIST OF LEDGER MASTERS
        </h3>
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-zinc-200 border border-zinc-800 bg-zinc-900 px-2 py-0.5 rounded text-[10px]"
        >
          GO BACK (ESC)
        </button>
      </div>

      {error && <div className="text-red-500 bg-red-950/20 border border-red-900/50 p-2 rounded mb-4 text-[10px]">{error}</div>}

      {/* Search Input */}
      <div className="border border-zinc-800 rounded bg-zinc-900/30 px-3 py-1.5 flex items-center gap-2 mb-3">
        <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Filter ledgers by name, type, or parent group..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-zinc-200 placeholder-zinc-555 w-full text-xs outline-hidden"
        />
        <kbd className="text-[9px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded font-sans">↑↓ NAV</kbd>
      </div>

      {loading && ledgers.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">Fetching master records...</div>
      ) : (
        /* List Box */
        <div ref={listContainerRef} className="overflow-y-auto border border-zinc-850 rounded flex-1">
          <table className="w-full text-left border-collapse text-[11px] grid-table">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-800">
                <th className="p-2 border-r border-zinc-800 w-2/5">Ledger Name</th>
                <th className="p-2 border-r border-zinc-800 w-1/5">Type</th>
                <th className="p-2 border-r border-zinc-800 w-1/5">Parent Group</th>
                <th className="p-2 border-r border-zinc-800 w-1/5 text-right">Balance</th>
                <th className="p-2 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-zinc-555">No ledgers found matching criteria.</td>
                </tr>
              ) : (
                filteredLedgers.map((l, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedIndex(idx)}
                      onDoubleClick={() => onEdit(l.id)}
                      className={`cursor-pointer border-b border-zinc-850 hover:bg-zinc-900/60 ${
                        isSelected ? 'bg-zinc-100 text-zinc-950 font-bold selected-row' : 'text-zinc-300'
                      }`}
                    >
                      <td className="p-2 border-r border-zinc-850 w-2/5 font-bold">{l.name}</td>
                      <td className="p-2 border-r border-zinc-850 w-1/5 uppercase text-[9px] text-zinc-500 tracking-wider">
                        {l.type}
                      </td>
                      <td className="p-2 border-r border-zinc-850 w-1/5 text-zinc-400">{l.group.name}</td>
                      <td className="p-2 border-r border-zinc-850 w-1/5 text-right font-mono font-bold">
                        ₹ {Number(l.currentBalance).toFixed(2)}
                      </td>
                      <td className="p-2 w-16 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(l.id, l.name);
                          }}
                          className={`text-[9px] font-bold ${
                            isSelected ? 'text-red-700 hover:text-red-900' : 'text-red-500 hover:text-red-400'
                          }`}
                        >
                          DEL
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-zinc-850 pt-3 mt-3 text-[9px] text-zinc-500 flex justify-between">
        <span>Press <strong className="text-zinc-400">Enter</strong> to Alter Ledger</span>
        <span>Use <strong className="text-zinc-400">↑↓ Arrow keys</strong> to scroll list</span>
      </div>
    </div>
  );
};
