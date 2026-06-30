import React, { useState, useEffect } from 'react';
import api from '../config/api';

interface UnitFormProps {
  unitId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const UnitForm: React.FC<UnitFormProps> = ({ unitId, onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!unitId) return;

    const fetchUnit = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/inventory/units`);
        // Find the unit from the list since we don't have a single-get endpoint for unit
        const u = res.data.find((item: any) => item.id === unitId);
        if (u) {
          setName(u.name);
        } else {
          setError('Unit not found');
        }
      } catch (err) {
        setError('Failed to load unit details');
      } finally {
        setLoading(false);
      }
    };

    fetchUnit();
  }, [unitId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { name: name.toUpperCase() }; // Typically units are uppercase

      if (unitId) {
        await api.put(`/inventory/units/${unitId}`, payload);
      } else {
        await api.post('/inventory/units', payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save unit of measure');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !name) {
    return <div className="text-zinc-500 font-mono text-center py-8">Loading unit form...</div>;
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-5 font-mono max-w-md mx-auto">
      <h3 className="text-xs font-bold text-zinc-350 border-b border-zinc-850 pb-2 mb-4">
        {unitId ? 'ALTER UNIT OF MEASURE' : 'CREATE UNIT OF MEASURE'}
      </h3>

      {error && <div className="text-red-500 bg-red-950/20 border border-red-900/50 p-2.5 rounded mb-4 text-[10px]">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[9px] text-zinc-500 uppercase mb-1">Unit Symbol / Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PCS, KG, BOX, LTR"
            className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden uppercase"
            autoFocus
          />
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
            {loading ? 'SAVING...' : unitId ? 'UPDATE UNIT' : 'CREATE UNIT'}
          </button>
        </div>
      </form>
    </div>
  );
};
