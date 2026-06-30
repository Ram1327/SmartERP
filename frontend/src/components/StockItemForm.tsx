import React, { useState, useEffect } from 'react';
import api from '../config/api';

interface StockItemFormProps {
  itemId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const StockItemForm: React.FC<StockItemFormProps> = ({ itemId, onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [groupId, setGroupId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [gstPercentage, setGstPercentage] = useState('18');
  const [quantity, setQuantity] = useState('0');

  const [groups, setGroups] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick Add Group states
  const [showQuickGroupForm, setShowQuickGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [quickGroupError, setQuickGroupError] = useState('');

  const fetchDependencies = async () => {
    try {
      const [groupsRes, unitsRes] = await Promise.all([
        api.get('/inventory/groups'),
        api.get('/inventory/units'),
      ]);
      setGroups(groupsRes.data);
      setUnits(unitsRes.data);
      if (unitsRes.data.length > 0 && !unitId) {
        setUnitId(unitsRes.data[0].id); // Select first unit by default
      }
    } catch (err) {
      console.error('Failed to load item dependencies', err);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    if (!itemId) return;

    const fetchItem = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/inventory/items/${itemId}`);
        const item = res.data;
        setName(item.name);
        setSku(item.sku || '');
        setGroupId(item.groupId || '');
        setUnitId(item.unitId);
        setPurchasePrice(String(item.purchasePrice));
        setSellingPrice(String(item.sellingPrice));
        setGstPercentage(String(item.gstPercentage));
        setQuantity(String(item.quantity));
      } catch (err) {
        setError('Failed to load stock item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId]);

  const handleQuickGroupSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    setQuickGroupError('');
    if (!newGroupName.trim()) return;

    try {
      const res = await api.post('/inventory/groups', { name: newGroupName });
      setGroups((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setGroupId(res.data.id);
      setNewGroupName('');
      setShowQuickGroupForm(false);
    } catch (err: any) {
      setQuickGroupError(err.response?.data?.error || 'Failed to create group');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!unitId) {
      setError('Please create at least one Unit of Measure (Alt+U) first.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        sku: sku || null,
        groupId: groupId || null,
        unitId,
        purchasePrice: parseFloat(purchasePrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        gstPercentage: parseFloat(gstPercentage) || 0,
        quantity: parseFloat(quantity) || 0,
      };

      if (itemId) {
        await api.put(`/inventory/items/${itemId}`, payload);
      } else {
        await api.post('/inventory/items', payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save stock item');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !name) {
    return <div className="text-zinc-500 font-mono text-center py-8">Loading stock item form...</div>;
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-5 font-mono max-w-xl mx-auto">
      <h3 className="text-xs font-bold text-zinc-350 border-b border-zinc-850 pb-2 mb-4">
        {itemId ? 'ALTER STOCK ITEM' : 'CREATE STOCK ITEM'}
      </h3>

      {error && <div className="text-red-500 bg-red-950/20 border border-red-900/50 p-2.5 rounded mb-4 text-[10px]">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Item Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HP Pavilion Laptop 15"
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">SKU / Part Number</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. HP-PAV-15"
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Unit of Measure (UoM)</label>
            {units.length === 0 ? (
              <div className="text-[10px] text-yellow-500 mt-1.5 bg-yellow-950/20 border border-yellow-900/40 p-1.5 rounded">
                No units created. Please create a Unit (Alt+U) first.
              </div>
            ) : (
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden h-[30px]"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Group Section with Quick Add */}
          <div className="col-span-2 border-t border-zinc-900 pt-3 mt-1">
            {showQuickGroupForm ? (
              <div className="flex gap-2 items-end bg-zinc-900 border border-zinc-850 p-3 rounded-sm">
                <div className="flex-1">
                  <label className="block text-[9px] text-zinc-500 uppercase mb-1">New Stock Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
                    placeholder="e.g. Laptops"
                    autoFocus
                  />
                  {quickGroupError && <div className="text-red-500 text-[8px] mt-1">{quickGroupError}</div>}
                </div>
                <button
                  type="button"
                  onClick={handleQuickGroupSubmit}
                  className="bg-zinc-100 text-zinc-950 px-3.5 py-1 text-[9px] font-bold rounded-sm h-[26px] hover:bg-zinc-200"
                >
                  ADD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickGroupForm(false);
                    setNewGroupName('');
                    setQuickGroupError('');
                  }}
                  className="bg-zinc-800 text-zinc-350 px-3 py-1 text-[9px] rounded-sm h-[26px] hover:text-zinc-200"
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[9px] text-zinc-500 uppercase mb-1">Stock Group (Optional)</label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden h-[30px]"
                  >
                    <option value="">None / Primary Group</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickGroupForm(true)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 px-3 py-1 text-[9px] rounded-sm h-[30px] font-bold shrink-0"
                >
                  + QUICK GROUP
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Purchase Price (₹)</label>
            <input
              type="number"
              step="any"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Selling Price (₹)</label>
            <input
              type="number"
              step="any"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">GST Tax Rate (%)</label>
            <select
              value={gstPercentage}
              onChange={(e) => setGstPercentage(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden h-[30px]"
            >
              <option value="0">0% (Nil Rated)</option>
              <option value="5">5% (GST)</option>
              <option value="12">12% (GST)</option>
              <option value="18">18% (GST)</option>
              <option value="28">28% (GST)</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Opening Stock Quantity</label>
            <input
              type="number"
              step="any"
              disabled={!!itemId} // Quantity altered via transactions/vouchers only
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden disabled:opacity-50"
            />
          </div>
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
            {loading ? 'SAVING...' : itemId ? 'UPDATE ITEM' : 'CREATE ITEM'}
          </button>
        </div>
      </form>
    </div>
  );
};
