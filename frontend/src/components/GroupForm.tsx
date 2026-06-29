import React, { useState, useEffect } from 'react';
import api from '../config/api';

interface GroupFormProps {
  groupId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const GroupForm: React.FC<GroupFormProps> = ({ groupId, onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [parentGroupId, setParentGroupId] = useState('');
  const [primaryGroup, setPrimaryGroup] = useState<'Assets' | 'Liabilities' | 'Income' | 'Expenses'>('Assets');

  const [groups, setGroups] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch groups list for Parent Group dropdown
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.get('/groups');
        setGroups(res.data);
      } catch (err) {
        console.error('Error fetching groups', err);
      }
    };

    fetchGroups();
  }, []);

  // Fetch existing group details if in Alter mode
  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/groups/${groupId}`);
        const g = res.data;
        setName(g.name);
        setParentGroupId(g.parentId || '');
        setPrimaryGroup(g.primaryGroup);
      } catch (err) {
        setError('Failed to load group details');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  // Determine active primary group based on parent group
  const parentGroup = groups.find((g) => g.id === parentGroupId);
  const activePrimaryGroup = parentGroup ? parentGroup.primaryGroup : primaryGroup;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        name,
        parentId: parentGroupId || null,
      };

      if (!parentGroupId) {
        payload.primaryGroup = primaryGroup;
      }

      if (groupId) {
        await api.put(`/groups/${groupId}`, payload);
      } else {
        await api.post('/groups', payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !name) {
    return <div className="text-zinc-500 font-mono text-center py-8">Loading group form...</div>;
  }

  // Filter out the current group from parent options to avoid self-selection
  const filteredParentOptions = groups.filter((g) => g.id !== groupId);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-5 font-mono max-w-xl mx-auto">
      <h3 className="text-xs font-bold text-zinc-350 border-b border-zinc-850 pb-2 mb-4">
        {groupId ? 'ALTER ACCOUNT GROUP' : 'CREATE NEW ACCOUNT GROUP'}
      </h3>

      {error && <div className="text-red-500 bg-red-950/20 border border-red-900/50 p-2.5 rounded mb-4 text-[10px]">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Group Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Operating Expenses"
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Parent Group (Optional)</label>
            <select
              value={parentGroupId}
              onChange={(e) => setParentGroupId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden h-[30px]"
            >
              <option value="">None (Top Level Group)</option>
              {filteredParentOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.primaryGroup})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase mb-1">Primary Group Type</label>
            <select
              value={activePrimaryGroup}
              onChange={(e) => setPrimaryGroup(e.target.value as any)}
              disabled={!!parentGroupId}
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden h-[30px]"
            >
              <option value="Assets">Assets</option>
              <option value="Liabilities">Liabilities</option>
              <option value="Income">Income</option>
              <option value="Expenses">Expenses</option>
            </select>
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
            {loading ? 'SAVING...' : groupId ? 'UPDATE GROUP' : 'CREATE GROUP'}
          </button>
        </div>
      </form>
    </div>
  );
};
