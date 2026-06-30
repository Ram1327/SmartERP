import React, { useState, useEffect, useRef } from 'react';
import api from '../config/api';

interface StockItemListProps {
  onEdit: (id: string) => void;
  onCreate: () => void;
  onBack: () => void;
}

export const StockItemList: React.FC<StockItemListProps> = ({ onEdit, onCreate, onBack }) => {
  const [items, setItems] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');

  const listContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/items');
      setItems(res.data);
    } catch (err) {
      setError('Failed to fetch stock items list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(filterText.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(filterText.toLowerCase()))
  );

  // Reset selected index when filtering
  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
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
  }, [filteredItems, selectedIndex, onEdit, onCreate, onBack]);

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
    if (!confirm(`Are you sure you want to delete stock item '${name}'?`)) return;

    try {
      await api.delete(`/inventory/items/${id}`);
      fetchItems();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete stock item');
    }
  };

  return (
    <div className="bg-zinc-955 border border-zinc-800 rounded p-5 font-mono max-w-4xl mx-auto flex flex-col h-[500px]">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-4">
        <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-wide">
          Stock Items Registry
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onCreate}
            className="text-zinc-950 font-bold bg-zinc-100 hover:bg-zinc-200 px-2.5 py-0.5 rounded-sm text-[10px]"
          >
            + CREATE STOCK ITEM (F2)
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
          placeholder="Search items by name or SKU..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="bg-transparent text-zinc-200 placeholder-zinc-555 w-full text-xs outline-hidden"
        />
        <kbd className="text-[9px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded font-sans">↑↓ NAV</kbd>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">Fetching stock registry...</div>
      ) : (
        /* List Table Box */
        <div ref={listContainerRef} className="overflow-y-auto border border-zinc-850 rounded flex-1 select-none">
          <table className="w-full text-left border-collapse text-[11px] grid-table">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-800">
                <th className="p-2 border-r border-zinc-800 w-1/4">Item Name</th>
                <th className="p-2 border-r border-zinc-800 w-20">SKU</th>
                <th className="p-2 border-r border-zinc-800 w-24">Group</th>
                <th className="p-2 border-r border-zinc-800 w-20 text-right">Purchase (₹)</th>
                <th className="p-2 border-r border-zinc-800 w-20 text-right">Selling (₹)</th>
                <th className="p-2 border-r border-zinc-800 w-12 text-center">GST %</th>
                <th className="p-2 border-r border-zinc-800 w-24 text-right">Qty / UoM</th>
                <th className="p-2 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-6 text-zinc-555 font-mono">No stock items found.</td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedIndex(idx)}
                      onDoubleClick={() => onEdit(item.id)}
                      className={`cursor-pointer border-b border-zinc-850 hover:bg-zinc-900/60 ${
                        isSelected ? 'bg-zinc-100 text-zinc-950 font-bold selected-row' : 'text-zinc-300'
                      }`}
                    >
                      <td className="p-2 border-r border-zinc-850 font-mono">
                        {item.name}
                      </td>
                      <td className="p-2 border-r border-zinc-850 font-mono text-zinc-400">
                        {item.sku || 'N/A'}
                      </td>
                      <td className="p-2 border-r border-zinc-850 text-zinc-400">
                        {item.group?.name || 'Primary'}
                      </td>
                      <td className="p-2 border-r border-zinc-850 text-right font-mono text-zinc-400">
                        {parseFloat(item.purchasePrice).toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-zinc-850 text-right font-mono">
                        {parseFloat(item.sellingPrice).toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-zinc-850 text-center font-mono text-zinc-400">
                        {parseFloat(item.gstPercentage)}%
                      </td>
                      <td className="p-2 border-r border-zinc-850 text-right font-mono font-bold text-zinc-200">
                        {parseFloat(item.quantity)} {item.unit?.name}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={(e) => handleDelete(item.id, item.name, e)}
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
        <span>Press <strong className="text-zinc-400">F2</strong> to Create Stock Item</span>
        <span>Press <strong className="text-zinc-400">ESC</strong> to return</span>
      </div>
    </div>
  );
};
