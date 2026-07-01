import React, { useState, useEffect, useRef } from 'react';
import api from '../config/api';

interface PurchaseVoucherFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface VoucherItemRow {
  stockItemId: string;
  quantity: number;
  rate: number;
  gstPercentage: number;
}

export const PurchaseVoucherForm: React.FC<PurchaseVoucherFormProps> = ({ onSuccess, onCancel }) => {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyLedgerId, setPartyLedgerId] = useState('');
  const [purchaseLedgerId, setPurchaseLedgerId] = useState('');
  const [narration, setNarration] = useState('');

  const [ledgers, setLedgers] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);

  const [items, setItems] = useState<VoucherItemRow[]>([
    { stockItemId: '', quantity: 1, rate: 0, gstPercentage: 18 }
  ]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Focus management refs
  const rowRefs = useRef<Array<Array<HTMLInputElement | HTMLSelectElement | null>>>([[]]);

  const fetchDependencies = async () => {
    try {
      const [ledgersRes, stockRes, companyRes] = await Promise.all([
        api.get('/ledgers'),
        api.get('/inventory/items'),
        api.get('/companies'),
      ]);

      setLedgers(ledgersRes.data);
      setStockItems(stockRes.data);

      const store = JSON.parse(localStorage.getItem('activeCompany') || '{}');
      if (store && store.id) {
        const activeComp = companyRes.data.find((c: any) => c.id === store.id);
        if (activeComp) {
          setCompany(activeComp);
        }
      }

      const pLedger = ledgersRes.data.find((l: any) => l.name === 'Purchase Account');
      if (pLedger) {
        setPurchaseLedgerId(pLedger.id);
      }
    } catch (err) {
      console.error('Failed to load voucher dependencies', err);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  const partyLedgers = ledgers.filter((l: any) => {
    const isSupplier = l.type === 'Supplier' || (l.group && l.group.name === 'Sundry Creditors');
    const isCash = l.type === 'Cash' || (l.group && l.group.name === 'Cash-in-hand');
    const isBank = l.type === 'Bank' || (l.group && l.group.name === 'Bank Accounts');
    return isSupplier || isCash || isBank;
  });

  const purchaseLedgers = ledgers.filter((l: any) => {
    return l.type === 'Expense' || (l.group && (l.group.name === 'Purchase Accounts' || l.group.name === 'Direct Expenses'));
  });

  const selectedParty = ledgers.find((l: any) => l.id === partyLedgerId);
  const isLocal = selectedParty?.supplier?.state && company?.state
    ? selectedParty.supplier.state.toLowerCase() === company.state.toLowerCase()
    : true;

  const addItemRow = () => {
    setItems([...items, { stockItemId: '', quantity: 1, rate: 0, gstPercentage: 18 }]);
    rowRefs.current.push([]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    rowRefs.current = rowRefs.current.filter((_, i) => i !== index);
  };

  const handleItemChange = (index: number, field: keyof VoucherItemRow, value: any) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'stockItemId') {
      item.stockItemId = value;
      const dbItem = stockItems.find((s) => s.id === value);
      if (dbItem) {
        item.rate = Number(dbItem.purchasePrice) || 0;
        item.gstPercentage = Number(dbItem.gstPercentage) || 18;
      }
    } else if (field === 'quantity') {
      item.quantity = Number(value) || 0;
    } else if (field === 'rate') {
      item.rate = Number(value) || 0;
    } else if (field === 'gstPercentage') {
      item.gstPercentage = Number(value) || 0;
    }

    setItems(newItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < items.length - 1) {
        rowRefs.current[rowIndex + 1][colIndex]?.focus();
      } else {
        addItemRow();
        setTimeout(() => {
          rowRefs.current[rowIndex + 1][colIndex]?.focus();
        }, 10);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        rowRefs.current[rowIndex - 1][colIndex]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      if (colIndex > 0) {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        if (target.tagName === 'SELECT' || (target as HTMLInputElement).selectionStart === 0) {
          e.preventDefault();
          rowRefs.current[rowIndex][colIndex - 1]?.focus();
        }
      }
    } else if (e.key === 'ArrowRight') {
      if (colIndex < 3) {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        if (target.tagName === 'SELECT' || (target as HTMLInputElement).selectionEnd === (target as HTMLInputElement).value.length) {
          e.preventDefault();
          rowRefs.current[rowIndex][colIndex + 1]?.focus();
        }
      }
    }
  };

  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  items.forEach((item) => {
    const itemSubtotal = item.quantity * item.rate;
    subtotal += itemSubtotal;

    const taxAmount = (itemSubtotal * item.gstPercentage) / 100;
    if (isLocal) {
      cgstTotal += taxAmount / 2;
      sgstTotal += taxAmount / 2;
    } else {
      igstTotal += taxAmount;
    }
  });

  const grandTotal = subtotal + cgstTotal + sgstTotal + igstTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyLedgerId) {
      setError('Party A/c Name is required');
      return;
    }
    if (!purchaseLedgerId) {
      setError('Purchase Ledger is required');
      return;
    }

    const filteredItems = items.filter((item) => item.stockItemId !== '');
    if (filteredItems.length === 0) {
      setError('Please add at least one stock item');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/vouchers', {
        voucherType: 'Purchase',
        date,
        partyLedgerId,
        purchaseLedgerId,
        referenceNumber: referenceNumber || null,
        narration: narration || null,
        items: filteredItems,
      });
      onSuccess();
    } catch (err: any) {
      console.error('Submit purchase voucher error:', err);
      setError(err.response?.data?.error || 'Failed to submit purchase voucher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto glass-panel p-6 rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="flex justify-between items-center mb-6 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            RECORD PURCHASE VOUCHER
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
            Day 7 Entry • Double-Entry Ledger & Inventory Update
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest text-zinc-400 border border-zinc-800 rounded hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
        >
          Cancel (ESC)
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-400 text-[11px] rounded flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 text-[12px] font-bold">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Supplier Invoice No / Ref
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. INV-1092"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-zinc-700 placeholder-zinc-650 transition-all"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Invoice Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-zinc-700 transition-all"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Party A/c Name (Credit/Cash)
            </label>
            <select
              value={partyLedgerId}
              onChange={(e) => setPartyLedgerId(e.target.value)}
              required
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-zinc-700 transition-all"
            >
              <option value="">Select Party</option>
              {partyLedgers.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.group?.name || l.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Purchase Ledger
            </label>
            <select
              value={purchaseLedgerId}
              onChange={(e) => setPurchaseLedgerId(e.target.value)}
              required
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-zinc-700 transition-all"
            >
              <option value="">Select Ledger</option>
              {purchaseLedgers.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {partyLedgerId && (
          <div className="p-2.5 bg-zinc-900/35 border border-zinc-800/80 rounded flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">
              Tax Context: <strong className="text-zinc-350 uppercase">{isLocal ? 'Intrastate (Local GST)' : 'Interstate (IGST)'}</strong>
            </span>
            <span className="text-zinc-500">
              Supplier State: <strong className="text-zinc-350">{selectedParty?.supplier?.state || company?.state || 'Same as Company'}</strong>
            </span>
          </div>
        )}

        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/20">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-800">
                <th className="p-3">Stock Item Name</th>
                <th className="p-3 text-right w-24">Qty</th>
                <th className="p-3 text-right w-28">Rate (₹)</th>
                <th className="p-3 text-right w-24">GST %</th>
                <th className="p-3 text-right w-32">Total Amount (₹)</th>
                <th className="p-3 text-center w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const lineAmount = item.quantity * item.rate;
                const gstMultiplier = item.gstPercentage / 100;
                const lineGst = lineAmount * gstMultiplier;
                const lineTotal = lineAmount + lineGst;

                return (
                  <tr key={index} className="border-b border-zinc-850 hover:bg-zinc-900/30">
                    <td className="p-2">
                      <select
                        ref={(el) => {
                          if (!rowRefs.current[index]) rowRefs.current[index] = [];
                          rowRefs.current[index][0] = el;
                        }}
                        value={item.stockItemId}
                        onChange={(e) => handleItemChange(index, 'stockItemId', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 0)}
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-zinc-700"
                      >
                        <option value="">-- Select Item --</option>
                        {stockItems.map((si) => (
                          <option key={si.id} value={si.id}>
                            {si.name} {si.sku ? `(${si.sku})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        ref={(el) => {
                          if (!rowRefs.current[index]) rowRefs.current[index] = [];
                          rowRefs.current[index][1] = el;
                        }}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 1)}
                        className="w-full text-right bg-zinc-950/50 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-zinc-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        ref={(el) => {
                          if (!rowRefs.current[index]) rowRefs.current[index] = [];
                          rowRefs.current[index][2] = el;
                        }}
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 2)}
                        className="w-full text-right bg-zinc-950/50 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-zinc-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        ref={(el) => {
                          if (!rowRefs.current[index]) rowRefs.current[index] = [];
                          rowRefs.current[index][3] = el;
                        }}
                        value={item.gstPercentage}
                        onChange={(e) => handleItemChange(index, 'gstPercentage', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 3)}
                        className="w-full text-right bg-zinc-950/50 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-zinc-700"
                      />
                    </td>
                    <td className="p-2 text-right font-medium text-zinc-300">
                      ₹ {lineTotal.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        disabled={items.length === 1}
                        className="text-red-500 hover:text-red-400 font-bold disabled:opacity-30 cursor-pointer"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-2.5 border-t border-zinc-800 bg-zinc-950/30 flex justify-between">
            <button
              type="button"
              onClick={addItemRow}
              className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-bold uppercase rounded hover:bg-zinc-800 cursor-pointer"
            >
              + Add Item Row (Alt+A)
            </button>
            <span className="text-[10px] text-zinc-500 self-center">
              Tip: Press ArrowDown in rate inputs to auto-insert rows
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-zinc-800/80">
          <div className="md:col-span-7">
            <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Narration / Notes
            </label>
            <textarea
              rows={4}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Enter voucher description or audit notes here..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-zinc-700 placeholder-zinc-600 transition-all resize-none"
            />
          </div>

          <div className="md:col-span-5 bg-zinc-900/35 border border-zinc-800 p-4 rounded-lg flex flex-col justify-between">
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between text-zinc-400">
                <span>Taxable Value:</span>
                <span>₹ {subtotal.toFixed(2)}</span>
              </div>
              {isLocal ? (
                <>
                  <div className="flex justify-between text-zinc-400">
                    <span>CGST Total:</span>
                    <span>₹ {cgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>SGST Total:</span>
                    <span>₹ {sgstTotal.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-zinc-400">
                  <span>IGST Total:</span>
                  <span>₹ {igstTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-zinc-800 pt-3 mt-3 flex justify-between">
              <span className="text-[12px] font-bold text-white uppercase">Voucher Total:</span>
              <span className="text-[13px] font-bold text-emerald-400">₹ {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded text-[11px] font-bold uppercase transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950/20"
          >
            {loading ? 'Posting...' : 'Save Purchase (Enter)'}
          </button>
        </div>
      </form>
    </div>
  );
};
