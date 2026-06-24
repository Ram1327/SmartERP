import React, { useState, useEffect, useRef } from 'react';

interface CommandItem {
  id: string;
  name: string;
  category: string;
  shortcut: string;
  action: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (action: string) => void;
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'home', name: 'Gateway Dashboard (Home)', category: 'Navigation', shortcut: 'Ctrl + H', action: 'HOME' },
  { id: 'select-company', name: 'Select/Switch Company', category: 'Navigation', shortcut: 'F1', action: 'COMPANY_SELECTION' },
  
  // Masters
  { id: 'create-ledger', name: 'Create Ledger', category: 'Masters', shortcut: 'Alt + L', action: 'CREATE_LEDGER' },
  { id: 'alter-ledger', name: 'Alter Ledger', category: 'Masters', shortcut: 'Alt + A', action: 'ALTER_LEDGER' },
  { id: 'create-group', name: 'Create Account Group', category: 'Masters', shortcut: 'Alt + G', action: 'CREATE_GROUP' },
  { id: 'create-stock', name: 'Create Stock Item', category: 'Masters', shortcut: 'Alt + S', action: 'CREATE_STOCK_ITEM' },
  { id: 'create-unit', name: 'Create Unit of Measure', category: 'Masters', shortcut: 'Alt + U', action: 'CREATE_UNIT' },

  // Vouchers
  { id: 'v-receipt', name: 'Receipt Voucher', category: 'Transactions', shortcut: 'F6', action: 'VOUCHER_RECEIPT' },
  { id: 'v-journal', name: 'Journal Voucher', category: 'Transactions', shortcut: 'F7', action: 'VOUCHER_JOURNAL' },
  { id: 'v-sales', name: 'Sales Voucher', category: 'Transactions', shortcut: 'F8', action: 'VOUCHER_SALES' },
  { id: 'v-purchase', name: 'Purchase Voucher', category: 'Transactions', shortcut: 'F9', action: 'VOUCHER_PURCHASE' },
  { id: 'v-credit', name: 'Credit Note', category: 'Transactions', shortcut: 'Alt + F8', action: 'VOUCHER_CREDIT_NOTE' },
  { id: 'v-debit', name: 'Debit Note', category: 'Transactions', shortcut: 'Alt + F9', action: 'VOUCHER_DEBIT_NOTE' },

  // Reports
  { id: 'r-trial', name: 'Trial Balance', category: 'Reports', shortcut: 'Alt + T', action: 'REPORT_TRIAL_BALANCE' },
  { id: 'r-pl', name: 'Profit & Loss Statement', category: 'Reports', shortcut: 'Alt + P', action: 'REPORT_PROFIT_LOSS' },
  { id: 'r-bs', name: 'Balance Sheet', category: 'Reports', shortcut: 'Alt + B', action: 'REPORT_BALANCE_SHEET' },
  { id: 'r-stock', name: 'Stock Summary', category: 'Reports', shortcut: 'Alt + R', action: 'REPORT_STOCK_SUMMARY' },
  { id: 'r-gst', name: 'GST Register', category: 'Reports', shortcut: 'Alt + X', action: 'REPORT_GST' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelectCommand }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelectCommand(filteredCommands[selectedIndex].action);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose, onSelectCommand]);

  // Adjust scroll when selected index changes
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-24 px-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[450px]">
        {/* Input */}
        <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-zinc-100 placeholder-zinc-500 w-full text-sm outline-hidden"
          />
          <kbd className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* List */}
        <div ref={listRef} className="overflow-y-auto flex-1 py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-6 text-zinc-500 text-sm text-center">No commands found.</div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                onClick={() => {
                  onSelectCommand(cmd.action);
                  onClose();
                }}
                className={`px-4 py-2.5 flex items-center justify-between cursor-pointer select-none text-xs ${
                  idx === selectedIndex ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 w-24 text-center">
                    {cmd.category}
                  </span>
                  <span>{cmd.name}</span>
                </div>
                <kbd className="text-[10px] text-zinc-650 tracking-wide font-mono">{cmd.shortcut}</kbd>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
