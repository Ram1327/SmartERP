import React, { useState, useEffect, useRef } from 'react';
import api from '../config/api';

interface UnitListProps {
  onEdit: (id: string) => void;
  onCreate: () => void;
  onBack: () => void;
}

export const UnitList: React.FC<UnitListProps> = ({ onEdit, onCreate, onBack }) => {
  const [units, setUnits] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');

  const listContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/units');
      setUnits(res.data);
    } catch (err) {
      setError('Failed to fetch units of measure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const filteredUnits = units.filter((u) =>
    u.name.toLowerCase().includes(filterText.toLowerCase())
  );

  // Reset selected index when filtering
  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredUnits.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUnits.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUnits.length) % filteredUnits.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredUnits[selectedIndex];
        if (selected) {
          onEdit(selected.id);
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        onCreate();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredUnits, selectedIndex, onEdit, onCreate, onBack]);

  // Scroll centering
  useEffect(() => {
    if (listContainerRef.current) {
      const activeEl = listContainerRef.current.querySelector('.selected-row') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete unit '${name}'?`)) return;

    try {
      await api.delete(`/inventory/units/${id}`);
      fetchUnits();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete unit');
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-5 font-mono max-w-xl mx-auto flex flex-col h-[450px]">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-4">
        <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-wide">
          Units of Measure (UoM)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onCreate}
            className="text-zinc-950 font-bold bg-zinc-100 hover:bg-zinc-200 px-2.5 py-0.5 rounded-sm text-[10px]"
          >
            + CREATE UNIT (F2)
          </button>
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-zinc-200 border border-zinc-800 bg-zinc-900 px-2 py-0.5 rounded text-[10px]"
          >
            GO BACK (ESC)
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 bg-red-950/20 border border-red-900/50 p-2 rounded mb-4 text-[10px]">{error}</div>}

      {/* Filter Input */}
      <div className="border border-zinc-800 rounded bg-zinc-900/30 px-3 py-1.5 flex items-center gap-2 mb-3">
        <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search units..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="bg-transparent text-zinc-200 placeholder-zinc-555 w-full text-xs outline-hidden uppercase"
        />
        <kbd className="text-[9px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded font-sans">↑↓ NAV</kbd>
      </div>

      {loading && units.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">Fetching units list...</div>
      ) : (
        /* List Box */
        <div ref={listContainerRef} className="overflow-y-auto border border-zinc-850 rounded flex-1 select-none">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-800">
                <th className="p-2 border-r border-zinc-800 w-3/4">Unit Symbol / Name</th>
                <th className="p-2 w-1/4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center p-6 text-zinc-555">No units found.</td>
                </tr>
              ) : (
                filteredUnits.map((u, idx) => {
                  const isSelected = idx === selectedIndex;

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedIndex(idx)}
                      onDoubleClick={() => onEdit(u.id)}
                      className={`cursor-pointer border-b border-zinc-850 hover:bg-zinc-900/60 ${
                        isSelected ? 'bg-zinc-100 text-zinc-950 font-bold selected-row' : 'text-zinc-300'
                      }`}
                    >
                      <td className="p-2 border-r border-zinc-855 font-mono">
                        {u.name}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={(e) => handleDelete(u.id, u.name, e)}
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

      <div className="border-t border-zinc-850 pt-3 mt-3 text-[9px] text-zinc-550 flex justify-between">
        <span>Press <strong className="text-zinc-400">Enter</strong> to Edit/Alter</span>
        <span>Press <strong className="text-zinc-400">F2</strong> to Create Unit</span>
        <span>Press <strong className="text-zinc-400">ESC</strong> to return</span>
      </div>
    </div>
  );
};
