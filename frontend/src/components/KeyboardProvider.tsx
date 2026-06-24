import React, { createContext, useContext, useEffect } from 'react';
import { useStore } from '@/store/useStore';

interface KeyboardContextType {
  // Can be extended if components need to register local actions
}

const KeyboardContext = createContext<KeyboardContextType | null>(null);

export const useKeyboard = () => {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
};

interface KeyboardProviderProps {
  children: React.ReactNode;
  onShortcutTriggered?: (action: string) => void;
}

export const KeyboardProvider: React.FC<KeyboardProviderProps> = ({ children, onShortcutTriggered }) => {
  const logout = useStore((state) => state.logout);
  const activeCompany = useStore((state) => state.activeCompany);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Helper to check if Ctrl key is pressed
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;

      // 1. Global Shortcuts (always active when logged in)
      if (ctrl && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        logout();
        if (onShortcutTriggered) onShortcutTriggered('LOGOUT');
        return;
      }

      if (ctrl && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('HOME');
        return;
      }

      if (ctrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('COMMAND_SEARCH');
        return;
      }

      // If not logged in or no company active, restrict other hotkeys
      if (!activeCompany) return;

      if (e.key === 'F1') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('COMPANY_SELECTION');
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('ESC');
        return;
      }

      // 2. Masters Shortcuts (ALT + Key)
      if (alt && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('CREATE_LEDGER');
        return;
      }
      if (alt && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('ALTER_LEDGER');
        return;
      }
      if (alt && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('CREATE_GROUP');
        return;
      }
      if (alt && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('CREATE_STOCK_ITEM');
        return;
      }
      if (alt && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('CREATE_UNIT');
        return;
      }

      // 3. Voucher Shortcuts (F keys and ALT + F keys)
      if (e.key === 'F6') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('VOUCHER_RECEIPT');
        return;
      }
      if (e.key === 'F7') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('VOUCHER_JOURNAL');
        return;
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (alt) {
          if (onShortcutTriggered) onShortcutTriggered('VOUCHER_CREDIT_NOTE');
        } else {
          if (onShortcutTriggered) onShortcutTriggered('VOUCHER_SALES');
        }
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (alt) {
          if (onShortcutTriggered) onShortcutTriggered('VOUCHER_DEBIT_NOTE');
        } else {
          if (onShortcutTriggered) onShortcutTriggered('VOUCHER_PURCHASE');
        }
        return;
      }

      // 4. Reports Shortcuts (ALT + Key)
      if (alt && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('REPORT_BALANCE_SHEET');
        return;
      }
      if (alt && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('REPORT_PROFIT_LOSS');
        return;
      }
      if (alt && e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('REPORT_TRIAL_BALANCE');
        return;
      }
      if (alt && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('REPORT_CASH_FLOW');
        return;
      }
      if (alt && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('REPORT_STOCK_SUMMARY');
        return;
      }
      if (alt && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        if (onShortcutTriggered) onShortcutTriggered('REPORT_GST');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCompany, logout, onShortcutTriggered]);

  return (
    <KeyboardContext.Provider value={{}}>
      {children}
    </KeyboardContext.Provider>
  );
};
