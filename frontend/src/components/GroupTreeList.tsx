import React, { useState, useEffect, useRef } from 'react';
import api from '../config/api';

interface GroupTreeListProps {
  onEdit: (id: string) => void;
  onCreate: () => void;
  onBack: () => void;
}

interface FlatRow {
  id: string;
  name: string;
  level: number;
  primaryGroup: string;
  parentId: string | null;
  ledgersCount: number;
  subgroupsCount: number;
  hasChildren: boolean;
}

export const GroupTreeList: React.FC<GroupTreeListProps> = ({ onEdit, onCreate, onBack }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');

  const listContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
      // Auto-expand top level groups initially
      const topLevelIds = res.data.filter((g: any) => !g.parentId).map((g: any) => g.id);
      setExpandedIds(new Set(topLevelIds));
    } catch (err) {
      setError('Failed to fetch groups list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  // Build tree structure
  const buildTree = (flatGroups: any[]): any[] => {
    const map: Record<string, any> = {};
    const roots: any[] = [];

    flatGroups.forEach((g) => {
      map[g.id] = {
        ...g,
        children: [],
        ledgersCount: g._count?.ledgers || 0,
        subgroupsCount: g._count?.subgroups || 0,
      };
    });

    flatGroups.forEach((g) => {
      const node = map[g.id];
      if (g.parentId && map[g.parentId]) {
        map[g.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // Flatten tree into visible rows based on expandedIds and filterText
  const getFlatRows = (): FlatRow[] => {
    const tree = buildTree(groups);
    const rows: FlatRow[] = [];

    const traverse = (node: any, level: number) => {
      const isExpanded = expandedIds.has(node.id);
      const hasChildren = node.children.length > 0;

      // Filter logic: if there is filter text, check if this node matches
      // or if any of its children match
      const matchesFilter = (n: any): boolean => {
        if (n.name.toLowerCase().includes(filterText.toLowerCase()) || 
            n.primaryGroup.toLowerCase().includes(filterText.toLowerCase())) {
          return true;
        }
        return n.children.some((child: any) => matchesFilter(child));
      };

      if (filterText && !matchesFilter(node)) {
        return;
      }

      rows.push({
        id: node.id,
        name: node.name,
        level,
        primaryGroup: node.primaryGroup,
        parentId: node.parentId,
        ledgersCount: node.ledgersCount,
        subgroupsCount: node.subgroupsCount,
        hasChildren,
      });

      if (hasChildren && (isExpanded || filterText)) {
        // If filtering is active, we expand everything by default
        node.children.forEach((child: any) => traverse(child, level + 1));
      }
    };

    tree.forEach((root) => traverse(root, 0));
    return rows;
  };

  const visibleRows = getFlatRows();

  // Reset selected index when filtering
  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (visibleRows.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % visibleRows.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + visibleRows.length) % visibleRows.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const selectedRow = visibleRows[selectedIndex];
        if (selectedRow && selectedRow.hasChildren && !expandedIds.has(selectedRow.id)) {
          const nextExpanded = new Set(expandedIds);
          nextExpanded.add(selectedRow.id);
          setExpandedIds(nextExpanded);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const selectedRow = visibleRows[selectedIndex];
        if (selectedRow) {
          if (selectedRow.hasChildren && expandedIds.has(selectedRow.id)) {
            const nextExpanded = new Set(expandedIds);
            nextExpanded.delete(selectedRow.id);
            setExpandedIds(nextExpanded);
          } else if (selectedRow.parentId) {
            // Find parent row index and select it
            const pIdx = visibleRows.findIndex((r) => r.id === selectedRow.parentId);
            if (pIdx !== -1) {
              setSelectedIndex(pIdx);
            }
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedRow = visibleRows[selectedIndex];
        if (selectedRow) {
          onEdit(selectedRow.id);
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
  }, [visibleRows, selectedIndex, expandedIds, onEdit, onCreate, onBack]);

  // Handle scroll centering
  useEffect(() => {
    if (listContainerRef.current) {
      const activeEl = listContainerRef.current.querySelector('.selected-row') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextExpanded = new Set(expandedIds);
    if (nextExpanded.has(id)) {
      nextExpanded.delete(id);
    } else {
      nextExpanded.add(id);
    }
    setExpandedIds(nextExpanded);
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete group '${name}'?`)) return;

    try {
      await api.delete(`/groups/${id}`);
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete group');
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-5 font-mono max-w-3xl mx-auto flex flex-col h-[500px]">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-4">
        <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-wide">
          Chart of Accounts (Groups Tree)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onCreate}
            className="text-zinc-950 font-bold bg-zinc-100 hover:bg-zinc-200 px-2.5 py-0.5 rounded-sm text-[10px]"
          >
            + CREATE GROUP (F2)
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
          placeholder="Search groups by name..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="bg-transparent text-zinc-200 placeholder-zinc-555 w-full text-xs outline-hidden"
        />
        <kbd className="text-[9px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded font-sans">↑↓ NAV</kbd>
      </div>

      {loading && groups.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">Fetching accounts structure...</div>
      ) : (
        /* List Tree Box */
        <div ref={listContainerRef} className="overflow-y-auto border border-zinc-850 rounded flex-1 select-none">
          <table className="w-full text-left border-collapse text-[11px] grid-table">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-800">
                <th className="p-2 border-r border-zinc-800 w-3/5">Group Name</th>
                <th className="p-2 border-r border-zinc-800 w-1/5">Type</th>
                <th className="p-2 border-r border-zinc-800 w-24 text-center">Ledgers</th>
                <th className="p-2 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-6 text-zinc-555">No groups found.</td>
                </tr>
              ) : (
                visibleRows.map((row, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isExpanded = expandedIds.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedIndex(idx)}
                      onDoubleClick={() => onEdit(row.id)}
                      className={`cursor-pointer border-b border-zinc-850 hover:bg-zinc-900/60 ${
                        isSelected ? 'bg-zinc-100 text-zinc-950 font-bold selected-row' : 'text-zinc-300'
                      }`}
                    >
                      <td className="p-2 border-r border-zinc-850 w-3/5 font-mono flex items-center gap-1.5" style={{ paddingLeft: `${row.level * 16 + 8}px` }}>
                        {row.hasChildren ? (
                          <button
                            onClick={(e) => toggleExpand(row.id, e)}
                            className="w-3.5 h-3.5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 select-none text-[8px] font-bold"
                          >
                            {isExpanded ? '▼' : '►'}
                          </button>
                        ) : (
                          <span className="w-3.5" />
                        )}
                        <span>{row.name}</span>
                      </td>
                      <td className="p-2 border-r border-zinc-850 w-1/5 uppercase text-[9px] text-zinc-550 tracking-wider">
                        {row.primaryGroup}
                      </td>
                      <td className="p-2 border-r border-zinc-850 w-24 text-center font-bold text-zinc-400">
                        {row.ledgersCount}
                      </td>
                      <td className="p-2 w-16 text-center">
                        <button
                          onClick={(e) => handleDelete(row.id, row.name, e)}
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
        <span>Press <strong className="text-zinc-400">F2</strong> to Create Group</span>
        <span>Use <strong className="text-zinc-400">►/◄</strong> to Expand/Collapse</span>
        <span>Press <strong className="text-zinc-400">ESC</strong> to return</span>
      </div>
    </div>
  );
};
