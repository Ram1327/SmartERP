import React, { useState, useEffect } from 'react';
import api from '../config/api';

interface LedgerFormProps {
  ledgerId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const LedgerForm: React.FC<LedgerFormProps> = ({ ledgerId, onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Customer' | 'Supplier' | 'Expense' | 'Income' | 'Bank' | 'Cash' | 'General'>('General');
  const [groupId, setGroupId] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const [groups, setGroups] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch groups list for dropdown
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.get('/ledgers/groups');
        setGroups(res.data);
        if (res.data.length > 0) {
          setGroupId(res.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching CoA groups', err);
      }
    };

    fetchGroups();
  }, []);

  // Fetch existing ledger details if ledgerId is provided (Alter mode)
  useEffect(() => {
    if (!ledgerId) return;

    const fetchLedger = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/ledgers/${ledgerId}`);
        const l = res.data;
        setName(l.name);
        setType(l.type);
        setGroupId(l.groupId);
        setOpeningBalance(Number(l.openingBalance));
        
        if (l.customer) {
          setMobileNumber(l.customer.mobileNumber || '');
          setAddress(l.customer.address || '');
          setGstin(l.customer.gstin || '');
        } else if (l.supplier) {
          setMobileNumber(l.supplier.mobileNumber || '');
          setAddress(l.supplier.address || '');
          setGstin(l.supplier.gstin || '');
        }
      } catch (err) {
        setError('Failed to load ledger details');
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [ledgerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        name,
        type,
        openingBalance,
      };

      // Only add GroupId if not Customer/Supplier (backend auto-assigns those)
      if (type !== 'Customer' && type !== 'Supplier') {
        payload.groupId = groupId;
      } else {
        payload.mobileNumber = mobileNumber || undefined;
        payload.address = address || undefined;
        payload.gstin = gstin || undefined;
      }

      if (ledgerId) {
        await api.put(`/ledgers/${ledgerId}`, payload);
      } else {
        await api.post('/ledgers', payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save ledger');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !name) {
    return <div className="text-zinc-500 font-mono text-center py-8">Loading ledger form...</div>;
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-5 font-mono max-w-xl mx-auto">
      <h3 className="text-xs font-bold text-zinc-350 border-b border-zinc-850 pb-2 mb-4">
        {ledgerId ? 'ALTER LEDGER MASTER' : 'CREATE NEW LEDGER MASTER'}
      </h3>

      {error && <div className="text-red-500 bg-red-950/20 border border-red-900/50 p-2.5 rounded mb-4 text-[10px]">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Ledger Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electric Corp"
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Ledger Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              disabled={!!ledgerId} // Type cannot be changed on alter
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden h-[30px]"
            >
              <option value="General">General Ledger</option>
              <option value="Customer">Customer</option>
              <option value="Supplier">Supplier</option>
              <option value="Bank">Bank Account</option>
              <option value="Cash">Cash Account</option>
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>
          </div>

          {type !== 'Customer' && type !== 'Supplier' && (
            <div>
              <label className="block text-[9px] text-zinc-500 uppercase mb-1">Account Group</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden h-[30px]"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.primaryGroup})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Opening Balance (₹)</label>
            <input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
            />
          </div>

          {(type === 'Customer' || type === 'Supplier') && (
            <>
              <div className="col-span-2 border-t border-zinc-850 pt-2 mt-2">
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide mb-3">Party Metadata Info</h4>
              </div>
              
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 9988776655"
                  className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[9px] text-zinc-500 uppercase mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="19AAAAA1111A1Z1"
                  className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[9px] text-zinc-500 uppercase mb-1">Billing / Shipping Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address Line, Landmark, City"
                  className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-zinc-850 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-1.5 rounded-sm text-[10px] hover:text-zinc-200"
          >
            CANCEL (ESC)
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-100 text-zinc-950 font-bold px-4 py-1.5 rounded-sm text-[10px] hover:bg-zinc-200 transition-colors"
          >
            {loading ? 'SAVING...' : ledgerId ? 'UPDATE LEDGER' : 'CREATE LEDGER'}
          </button>
        </div>
      </form>
    </div>
  );
};
