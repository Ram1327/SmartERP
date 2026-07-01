import React, { useState, useEffect } from 'react';
import api from '../config/api';

interface PurchaseVoucherListProps {
  onCreateClick: () => void;
}

export const PurchaseVoucherList: React.FC<PurchaseVoucherListProps> = ({ onCreateClick }) => {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vouchers?type=Purchase');
      setVouchers(res.data);
    } catch (err) {
      console.error('Failed to fetch purchase vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleDelete = async (id: string, voucherNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete and roll back Purchase Voucher '${voucherNumber}'?`)) return;

    try {
      await api.delete(`/vouchers/${id}`);
      fetchVouchers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete voucher');
    }
  };

  const filtered = vouchers.filter((v: any) => {
    const partyName = v.entries?.find((e: any) => e.entryType === 'Credit')?.ledger?.name || '';
    return (
      v.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
      (v.referenceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      partyName.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Handle Keyboard Selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        const active = filtered[selectedIndex];
        if (active) {
          setExpandedId(expandedId === active.id ? null : active.id);
        }
      } else if (e.key === 'Delete' && filtered.length > 0) {
        e.preventDefault();
        const active = filtered[selectedIndex];
        if (active) {
          // Trigger delete programmatically
          const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
          handleDelete(active.id, active.voucherNumber, fakeEvent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, expandedId]);

  return (
    <div className="max-w-5xl mx-auto glass-panel p-6 rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-2xl relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            Purchase Invoices Registry
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
            Supplier Bills, Ledger Journal Posting, & Stock Transactions
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider rounded transition-all shadow-md cursor-pointer"
        >
          + Record Purchase (F2)
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Search by Voucher #, Ref #, or Party Name..."
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-[11px] text-white focus:outline-none focus:border-zinc-700 transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-[11px] text-zinc-500 uppercase tracking-widest animate-pulse">
          Loading Purchases...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-[11px] uppercase tracking-wider">
          No Purchase Vouchers Found.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/10">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-800">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3 w-32">Voucher No</th>
                <th className="p-3 w-28">Date</th>
                <th className="p-3 w-32">Supplier Invoice Ref</th>
                <th className="p-3">Party Name</th>
                <th className="p-3 text-right w-36">Grand Total (₹)</th>
                <th className="p-3 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: any, index: number) => {
                const isSelected = index === selectedIndex;
                const isExpanded = expandedId === v.id;
                const creditEntry = v.entries?.find((e: any) => e.entryType === 'Credit');
                const partyName = creditEntry?.ledger?.name || 'N/A';

                return (
                  <React.Fragment key={v.id}>
                    <tr
                      onClick={() => {
                        setSelectedIndex(index);
                        setExpandedId(isExpanded ? null : v.id);
                      }}
                      className={`cursor-pointer border-b border-zinc-850 transition-all ${
                        isSelected ? 'bg-zinc-905/70 font-semibold text-white' : 'hover:bg-zinc-900/30 text-zinc-300'
                      }`}
                    >
                      <td className="p-3 text-center text-zinc-500">{index + 1}</td>
                      <td className="p-3 font-mono font-medium text-emerald-400">{v.voucherNumber}</td>
                      <td className="p-3">{new Date(v.date).toLocaleDateString()}</td>
                      <td className="p-3 text-zinc-450">{v.referenceNumber || 'N/A'}</td>
                      <td className="p-3">{partyName}</td>
                      <td className="p-3 text-right font-bold text-white">₹ {Number(v.totalAmount).toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => handleDelete(v.id, v.voucherNumber, e)}
                          className={`text-[9px] font-bold uppercase ${
                            isSelected ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-400'
                          }`}
                        >
                          DEL
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-zinc-900/40 border-b border-zinc-800">
                        <td colSpan={7} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[10.5px]">
                            {/* Ledger Entries */}
                            <div className="space-y-2 border-r border-zinc-800/80 pr-6">
                              <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                Ledger Journal Posting (Double Entry)
                              </h4>
                              {v.entries?.map((entry: any) => (
                                <div key={entry.id} className="flex justify-between items-center py-1 border-b border-zinc-900">
                                  <div>
                                    <span className="font-mono text-zinc-300">{entry.ledger?.name}</span>
                                    <span className={`ml-2 text-[8px] font-bold uppercase px-1 rounded ${
                                      entry.entryType === 'Debit' ? 'bg-emerald-950/60 text-emerald-400' : 'bg-amber-950/60 text-amber-400'
                                    }`}>
                                      {entry.entryType}
                                    </span>
                                  </div>
                                  <span className="font-mono text-zinc-300">₹ {Number(entry.amount).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            {/* Inventory Transactions */}
                            <div className="space-y-2">
                              <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                Inventory Items Log (Quantity In)
                              </h4>
                              {v.inventoryTransactions?.map((tx: any) => (
                                <div key={tx.id} className="flex justify-between items-center py-1 border-b border-zinc-900">
                                  <div>
                                    <span className="text-zinc-350">{tx.stockItem?.name}</span>
                                    <span className="text-[9px] text-zinc-500 ml-1.5 font-mono">
                                      {Number(tx.quantity)} {tx.stockItem?.unit?.name || 'PCS'}
                                    </span>
                                  </div>
                                  <span className="font-mono text-zinc-300">
                                    @ ₹ {Number(tx.price).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                              {v.narration && (
                                <div className="mt-3 pt-3 border-t border-zinc-800 text-[10px] text-zinc-450 italic">
                                  Narration: &quot;{v.narration}&quot;
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          <div className="p-3 bg-zinc-950/40 text-[10px] text-zinc-500 flex justify-between">
            <span>
              Use <strong className="text-zinc-400">↑ ↓ Arrow keys</strong> to select, <strong className="text-zinc-400">Enter</strong> to Expand details, <strong className="text-zinc-400">DEL</strong> to void/delete.
            </span>
            <span>
              Showing {filtered.length} purchase vouchers
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
