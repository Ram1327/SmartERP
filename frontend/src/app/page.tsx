'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import api from '@/config/api';
import { KeyboardProvider } from '@/components/KeyboardProvider';
import { CommandPalette } from '@/components/CommandPalette';
import { LedgerForm } from '@/components/LedgerForm';
import { LedgerList } from '@/components/LedgerList';
import { GroupForm } from '@/components/GroupForm';
import { GroupTreeList } from '@/components/GroupTreeList';
import { UnitForm } from '@/components/UnitForm';
import { UnitList } from '@/components/UnitList';
import { StockItemForm } from '@/components/StockItemForm';
import { StockItemList } from '@/components/StockItemList';
import { PurchaseVoucherForm } from '@/components/PurchaseVoucherForm';
import { PurchaseVoucherList } from '@/components/PurchaseVoucherList';

// Core Gateway Menu items
interface MenuItem {
  name: string;
  action: string;
  shortcut?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const GATEWAY_MENU: MenuSection[] = [
  {
    title: 'Masters',
    items: [
      { name: 'Create Ledger', action: 'CREATE_LEDGER', shortcut: 'Alt+L' },
      { name: 'Alter Ledger', action: 'ALTER_LEDGER', shortcut: 'Alt+A' },
      { name: 'Create Group', action: 'CREATE_GROUP', shortcut: 'Alt+G' },
      { name: 'Create Stock Item', action: 'CREATE_STOCK_ITEM', shortcut: 'Alt+S' },
      { name: 'Create Unit', action: 'CREATE_UNIT', shortcut: 'Alt+U' },
    ],
  },
  {
    title: 'Transactions',
    items: [
      { name: 'Receipt Voucher', action: 'VOUCHER_RECEIPT', shortcut: 'F6' },
      { name: 'Journal Voucher', action: 'VOUCHER_JOURNAL', shortcut: 'F7' },
      { name: 'Sales Voucher', action: 'VOUCHER_SALES', shortcut: 'F8' },
      { name: 'Purchase Voucher', action: 'VOUCHER_PURCHASE', shortcut: 'F9' },
      { name: 'Credit Note', action: 'VOUCHER_CREDIT_NOTE', shortcut: 'Alt+F8' },
      { name: 'Debit Note', action: 'VOUCHER_DEBIT_NOTE', shortcut: 'Alt+F9' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { name: 'Trial Balance', action: 'REPORT_TRIAL_BALANCE', shortcut: 'Alt+T' },
      { name: 'Profit & Loss', action: 'REPORT_PROFIT_LOSS', shortcut: 'Alt+P' },
      { name: 'Balance Sheet', action: 'REPORT_BALANCE_SHEET', shortcut: 'Alt+B' },
      { name: 'Stock Summary', action: 'REPORT_STOCK_SUMMARY', shortcut: 'Alt+R' },
      { name: 'GST Register', action: 'REPORT_GST', shortcut: 'Alt+X' },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'Switch Company', action: 'COMPANY_SELECTION', shortcut: 'F1' },
      { name: 'Logout', action: 'LOGOUT', shortcut: 'Ctrl+Q' },
    ],
  },
];

// Flattened list for keyboard arrow navigation
const flatMenuItems = GATEWAY_MENU.flatMap(section => section.items);

export default function Home() {
  const { token, user, activeCompany, setSession, setActiveCompany, logout } = useStore();

  // Navigation states
  const [view, setView] = useState<'AUTH' | 'COMPANY_SELECT' | 'DASHBOARD'>('AUTH');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [subScreen, setSubScreen] = useState<string>('MAIN');
  const [activeLedgerId, setActiveLedgerId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [isCreatingUnit, setIsCreatingUnit] = useState<boolean>(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState<boolean>(false);
  const [isRecordingPurchase, setIsRecordingPurchase] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Command palette state
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // Company management states
  const [companies, setCompanies] = useState<any[]>([]);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [compName, setCompName] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compGst, setCompGst] = useState('');
  const [compState, setCompState] = useState('West Bengal');
  const [compContact, setCompContact] = useState('');
  const [compFYStart, setCompFYStart] = useState('2026-04-01');
  const [companyError, setCompanyError] = useState('');

  // Dashboard state & Traversal
  const [flatMenuIndex, setFlatMenuIndex] = useState(0);

  // Set mounted flag on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync view based on store state
  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      setView('AUTH');
      setSubScreen('MAIN');
    } else if (!activeCompany) {
      setView('COMPANY_SELECT');
      setSubScreen('MAIN');
      fetchCompanies();
    } else {
      setView('DASHBOARD');
    }
  }, [token, activeCompany, mounted]);

  // Fetch all companies from server
  const fetchCompanies = async () => {
    try {
      const res = await api.get('/companies');
      setCompanies(res.data);
    } catch (err: any) {
      console.error('Fetch companies failed', err);
    }
  };

  // Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');

    try {
      if (authMode === 'LOGIN') {
        const res = await api.post('/auth/login', { email, password });
        setSession(res.data.accessToken, res.data.user);
        setEmail('');
        setPassword('');
      } else {
        const res = await api.post('/auth/register', { email, password });
        setAuthMessage(res.data.message + '. Please login now.');
        setAuthMode('LOGIN');
        setPassword('');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.error || 'Authentication failed. Please try again.');
    }
  };

  // Create or Alter Company
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError('');

    try {
      const payload = {
        name: compName,
        address: compAddress,
        gstNumber: compGst || undefined,
        financialYearStart: new Date(compFYStart).toISOString(),
        state: compState,
        contactInfo: compContact || undefined,
      };

      if (editingCompanyId) {
        await api.put(`/companies/${editingCompanyId}`, payload);
      } else {
        await api.post('/companies', payload);
      }

      // Reset
      setCompName('');
      setCompAddress('');
      setCompGst('');
      setCompContact('');
      setEditingCompanyId(null);
      setShowCompanyForm(false);
      fetchCompanies();
    } catch (err: any) {
      setCompanyError(err.response?.data?.error || 'Error processing company request.');
    }
  };

  // Delete Company
  const handleDeleteCompany = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this company? All accounting data will be lost.')) return;
    try {
      await api.delete(`/companies/${id}`);
      fetchCompanies();
    } catch (err) {
      console.error('Delete company failed', err);
    }
  };

  // Load Company edit state
  const handleEditCompanyClick = (company: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCompanyId(company.id);
    setCompName(company.name);
    setCompAddress(company.address);
    setCompGst(company.gstNumber || '');
    setCompState(company.state);
    setCompContact(company.contactInfo || '');
    setCompFYStart(company.financialYearStart.substring(0, 10));
    setShowCompanyForm(true);
  };

  // Keyboard shortcut routing
  const handleShortcut = (action: string) => {
    if (action === 'LOGOUT') {
      logout();
      setView('AUTH');
    } else if (action === 'COMPANY_SELECTION') {
      setActiveCompany(null);
      setView('COMPANY_SELECT');
      setSubScreen('MAIN');
    } else if (action === 'HOME') {
      setSubScreen('MAIN');
    } else if (action === 'COMMAND_SEARCH') {
      setIsCommandOpen(true);
    } else if (action === 'ESC') {
      if (subScreen === 'VOUCHER_PURCHASE' && isRecordingPurchase) {
        setIsRecordingPurchase(false);
      } else {
        setSubScreen('MAIN');
      }
    } else {
      // Set the subscreen based on navigation
      setSubScreen(action);
    }
  };

  // Traversal listener inside Gateway
  useEffect(() => {
    if (view !== 'DASHBOARD' || subScreen !== 'MAIN') return;

    const handleMenuNavigation = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFlatMenuIndex((prev) => (prev + 1) % flatMenuItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFlatMenuIndex((prev) => (prev - 1 + flatMenuItems.length) % flatMenuItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeItem = flatMenuItems[flatMenuIndex];
        if (activeItem) {
          handleShortcut(activeItem.action);
        }
      }
    };

    window.addEventListener('keydown', handleMenuNavigation);
    return () => window.removeEventListener('keydown', handleMenuNavigation);
  }, [view, subScreen, flatMenuIndex]);

  // F2 key listener when inside Purchase Voucher list to trigger new entry form
  useEffect(() => {
    if (view !== 'DASHBOARD' || subScreen !== 'VOUCHER_PURCHASE' || isRecordingPurchase) return;

    const handlePurchaseListKeys = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsRecordingPurchase(true);
      }
    };

    window.addEventListener('keydown', handlePurchaseListKeys);
    return () => window.removeEventListener('keydown', handlePurchaseListKeys);
  }, [view, subScreen, isRecordingPurchase]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-500 font-mono flex items-center justify-center text-[10px] uppercase tracking-widest">
        Loading SmartERP System...
      </div>
    );
  }

  return (
    <KeyboardProvider onShortcutTriggered={handleShortcut}>
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectCommand={handleShortcut}
      />
      
      {/* ─── MAIN ROUTER CONTAINER ─── */}
      <div className="min-h-screen flex flex-col justify-between text-zinc-100 text-xs select-none">
        
        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-2 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-sm bg-zinc-100 text-zinc-950 px-1 rounded-sm">SmartERP</span>
            <span className="text-[10px] text-zinc-500 font-sans">Keyboard First Accounting</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-zinc-400">
            {activeCompany && (
              <span className="bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-zinc-200">
                ACTIVE: {activeCompany.name} ({activeCompany.state})
              </span>
            )}
            {user && (
              <span>USER: {user.email}</span>
            )}
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 flex items-center justify-center p-4">
          
          {/* 1. AUTH SCREEN */}
          {view === 'AUTH' && (
            <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg p-6 shadow-2xl font-mono">
              <h2 className="text-sm font-bold border-b border-zinc-800 pb-3 mb-4 text-center">
                {authMode === 'LOGIN' ? 'SECURE GATEWAY SIGN-IN' : 'ACCOUNT REGISTRATION'}
              </h2>
              {authError && <div className="text-red-500 bg-red-950/20 border border-red-900/50 p-2.5 rounded mb-4 text-[10px]">{authError}</div>}
              {authMessage && <div className="text-emerald-500 bg-emerald-950/20 border border-emerald-900/50 p-2.5 rounded mb-4 text-[10px]">{authMessage}</div>}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase mb-1.5">User Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-200 text-xs focus:border-zinc-500 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-200 text-xs focus:border-zinc-500 outline-hidden font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-2 rounded text-[11px] transition-colors"
                >
                  {authMode === 'LOGIN' ? 'PROCEED TO COMPANY SELECT' : 'SUBMIT REGISTRATION'}
                </button>
              </form>
              <div className="mt-4 pt-4 border-t border-zinc-800 text-center text-[10px] text-zinc-500">
                {authMode === 'LOGIN' ? (
                  <span>
                    New operator?{' '}
                    <button onClick={() => setAuthMode('REGISTER')} className="text-zinc-300 underline font-bold hover:text-zinc-100">
                      Create account
                    </button>
                  </span>
                ) : (
                  <span>
                    Already registered?{' '}
                    <button onClick={() => setAuthMode('LOGIN')} className="text-zinc-300 underline font-bold hover:text-zinc-100">
                      Sign in here
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 2. COMPANY SELECT SCREEN */}
          {view === 'COMPANY_SELECT' && (
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-lg p-6 shadow-2xl font-mono">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <h2 className="text-sm font-bold">LIST OF MANAGED COMPANIES</h2>
                {!showCompanyForm && companies.length < 5 && (
                  <button
                    onClick={() => {
                      setEditingCompanyId(null);
                      setCompName('');
                      setCompAddress('');
                      setCompGst('');
                      setCompContact('');
                      setShowCompanyForm(true);
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1 rounded-sm text-[10px] border border-zinc-750 font-bold"
                  >
                    + CREATE NEW (F1)
                  </button>
                )}
              </div>

              {companyError && <div className="text-red-500 bg-red-950/20 border border-red-900/50 p-2 rounded mb-4 text-[10px]">{companyError}</div>}

              {showCompanyForm ? (
                /* CREATE / ALTER FORM */
                <form onSubmit={handleCompanySubmit} className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400">{editingCompanyId ? 'ALTER COMPANY DETAILS' : 'CREATE NEW COMPANY'}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] text-zinc-500 uppercase mb-1">Company Name</label>
                      <input
                        type="text"
                        required
                        value={compName}
                        onChange={(e) => setCompName(e.target.value)}
                        placeholder="Acme Enterprises"
                        className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-500 uppercase mb-1">GSTIN Number (Optional)</label>
                      <input
                        type="text"
                        value={compGst}
                        onChange={(e) => setCompGst(e.target.value)}
                        placeholder="27AAAAA1111A1Z1"
                        className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] text-zinc-500 uppercase mb-1">Registered Address</label>
                      <input
                        type="text"
                        required
                        value={compAddress}
                        onChange={(e) => setCompAddress(e.target.value)}
                        placeholder="123 Corporate Tower, Mumbai"
                        className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-500 uppercase mb-1">State / Union Territory</label>
                      <input
                        type="text"
                        required
                        value={compState}
                        onChange={(e) => setCompState(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-500 uppercase mb-1">Contact Number</label>
                      <input
                        type="text"
                        value={compContact}
                        onChange={(e) => setCompContact(e.target.value)}
                        placeholder="+91 9988776655"
                        className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-500 uppercase mb-1">Financial Year Start</label>
                      <input
                        type="date"
                        required
                        value={compFYStart}
                        onChange={(e) => setCompFYStart(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:border-zinc-650 outline-hidden text-zinc-400 font-sans"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCompanyForm(false)}
                      className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-1.5 rounded-sm text-[10px] hover:text-zinc-200"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      className="bg-zinc-100 text-zinc-950 font-bold px-4 py-1.5 rounded-sm text-[10px] hover:bg-zinc-200"
                    >
                      {editingCompanyId ? 'SAVE CHANGES' : 'CREATE COMPANY'}
                    </button>
                  </div>
                </form>
              ) : (
                /* COMPANY LIST VIEW */
                <div className="space-y-2">
                  {companies.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 border border-dashed border-zinc-850 rounded">
                      No companies found. Create one to begin.
                    </div>
                  ) : (
                    companies.map((company) => (
                      <div
                        key={company.id}
                        onClick={() => setActiveCompany(company)}
                        className="bg-zinc-900 border border-zinc-800 hover:border-zinc-650 p-4 rounded flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div>
                          <div className="font-bold text-zinc-100 text-xs group-hover:text-zinc-50">{company.name}</div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            {company.address} | GSTIN: {company.gstNumber || 'None'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 opacity-60 group-hover:opacity-100">
                          <span className="text-[9px] text-zinc-400 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded font-sans">
                            FY: {new Date(company.financialYearStart).getFullYear()}
                          </span>
                          <button
                            onClick={(e) => handleEditCompanyClick(company, e)}
                            className="text-zinc-400 hover:text-zinc-200 text-[10px]"
                          >
                            ALTER
                          </button>
                          <button
                            onClick={(e) => handleDeleteCompany(company.id, e)}
                            className="text-red-500 hover:text-red-400 text-[10px]"
                          >
                            DELETE
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="text-[9px] text-zinc-650 mt-4 text-center">
                    Note: A maximum of 5 companies can be added per operator account.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. GATEWAY MAIN DASHBOARD SCREEN */}
          {view === 'DASHBOARD' && subScreen === 'MAIN' && (
            <div className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl flex flex-col font-mono">
              {/* TOP STRIP */}
              <div className="border-b border-zinc-800 px-4 py-2 bg-zinc-900/40 flex justify-between items-center text-[10px]">
                <div className="text-zinc-400">
                  Current Company: <strong className="text-zinc-100">{activeCompany?.name}</strong>
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                  <span>GSTIN: <strong className="text-zinc-200">{activeCompany?.gstNumber || 'N/A'}</strong></span>
                  <span>FY Start: <strong className="text-zinc-200">{activeCompany && new Date(activeCompany.financialYearStart).toLocaleDateString()}</strong></span>
                </div>
              </div>

              {/* CORE SPLIT SCREEN */}
              <div className="flex divide-x divide-zinc-800 min-h-[380px]">
                
                {/* LEFT PANE: KEYBOARD NAVIGATION MENU */}
                <div className="w-2/5 p-4 bg-zinc-950">
                  <div className="border border-zinc-800 rounded-sm bg-zinc-900/10 p-3">
                    <h3 className="font-bold border-b border-zinc-850 pb-2 mb-3 text-zinc-300 text-center tracking-wider uppercase text-[10px]">
                      Gateway of SmartERP
                    </h3>
                    
                    <div className="space-y-4">
                      {GATEWAY_MENU.map((section) => (
                        <div key={section.title}>
                          <h4 className="text-[9px] font-bold text-zinc-555 uppercase tracking-wider mb-1.5 px-2">
                            {section.title}
                          </h4>
                          <div className="space-y-0.5">
                            {section.items.map((item) => {
                              // Calculate overall flat index to highlight correctly
                              const flatIdx = flatMenuItems.findIndex(f => f.action === item.action);
                              const isHighlighted = flatIdx === flatMenuIndex;

                              return (
                                <div
                                  key={item.action}
                                  onClick={() => handleShortcut(item.action)}
                                  className={`px-3 py-1 rounded-xs cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                    isHighlighted ? 'bg-zinc-100 text-zinc-950 font-bold' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                  }`}
                                >
                                  <span>{item.name}</span>
                                  {item.shortcut && (
                                    <kbd className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                      isHighlighted ? 'bg-zinc-250 text-zinc-900 border border-zinc-900' : 'bg-zinc-900 border border-zinc-850 text-zinc-500'
                                    }`}>
                                      {item.shortcut}
                                    </kbd>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT PANE: DATA SUMMARY SCREEN */}
                <div className="w-3/5 p-5 bg-zinc-900/10 flex flex-col justify-between">
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold text-zinc-350 tracking-wide uppercase border-b border-zinc-800 pb-1.5">
                      Account Overview
                    </h3>

                    {/* Summary statistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-950 border border-zinc-850 rounded p-3">
                        <div className="text-[9px] text-zinc-500 uppercase">Cash In Hand</div>
                        <div className="text-sm font-bold text-zinc-100 mt-1">₹ 0.00</div>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-850 rounded p-3">
                        <div className="text-[9px] text-zinc-500 uppercase">Bank Accounts</div>
                        <div className="text-sm font-bold text-zinc-100 mt-1">₹ 0.00</div>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-850 rounded p-3">
                        <div className="text-[9px] text-zinc-500 uppercase">Outstanding Sales (Sundry Debtors)</div>
                        <div className="text-sm font-bold text-zinc-100 mt-1">₹ 0.00</div>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-850 rounded p-3">
                        <div className="text-[9px] text-zinc-500 uppercase">Outstanding Dues (Sundry Creditors)</div>
                        <div className="text-sm font-bold text-zinc-100 mt-1">₹ 0.00</div>
                      </div>
                    </div>
                  </div>

                  {/* Keyboard help strip */}
                  <div className="border-t border-zinc-800 pt-4 flex gap-4 text-[9px] text-zinc-500">
                    <div>Use <strong className="text-zinc-400 font-sans">↑ ↓ Arrow keys</strong> to Navigate</div>
                    <div>Press <strong className="text-zinc-400">Enter</strong> to Select</div>
                    <div>Press <strong className="text-zinc-400">Ctrl + K</strong> Search Command</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 4. GATEWAY INLINE SUB-SCREEN WORKSPACE */}
          {view === 'DASHBOARD' && subScreen !== 'MAIN' && (
            <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl p-5 font-mono min-h-[350px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
                  <h2 className="text-xs font-bold text-zinc-100 tracking-widest uppercase">
                    Gateway &gt; {subScreen.replace('VOUCHER_', '').replace('REPORT_', '').replace('CREATE_', 'Create ').replace('ALTER_', 'Alter ')}
                  </h2>
                  <button
                    onClick={() => setSubScreen('MAIN')}
                    className="text-zinc-400 hover:text-zinc-100 border border-zinc-800 bg-zinc-900 px-2 py-0.5 rounded text-[10px]"
                  >
                    GO BACK (ESC)
                  </button>
                </div>

                {/* Ledger Management Sub-screens */}
                {subScreen === 'CREATE_LEDGER' && (
                  <LedgerForm
                    ledgerId={null}
                    onSuccess={() => setSubScreen('MAIN')}
                    onCancel={() => setSubScreen('MAIN')}
                  />
                )}

                {subScreen === 'ALTER_LEDGER' && (
                  activeLedgerId ? (
                    <LedgerForm
                      ledgerId={activeLedgerId}
                      onSuccess={() => {
                        setActiveLedgerId(null);
                        setSubScreen('ALTER_LEDGER'); // Return to list
                      }}
                      onCancel={() => setActiveLedgerId(null)}
                    />
                  ) : (
                    <LedgerList
                      onEdit={(id) => setActiveLedgerId(id)}
                      onBack={() => setSubScreen('MAIN')}
                    />
                  )
                )}

                {subScreen === 'CREATE_GROUP' && (
                  isCreatingGroup || activeGroupId ? (
                    <GroupForm
                      groupId={activeGroupId}
                      onSuccess={() => {
                        setActiveGroupId(null);
                        setIsCreatingGroup(false);
                      }}
                      onCancel={() => {
                        setActiveGroupId(null);
                        setIsCreatingGroup(false);
                      }}
                    />
                  ) : (
                    <GroupTreeList
                      onCreate={() => setIsCreatingGroup(true)}
                      onEdit={(id) => setActiveGroupId(id)}
                      onBack={() => setSubScreen('MAIN')}
                    />
                  )
                )}

                {subScreen === 'CREATE_UNIT' && (
                  isCreatingUnit || activeUnitId ? (
                    <UnitForm
                      unitId={activeUnitId}
                      onSuccess={() => {
                        setActiveUnitId(null);
                        setIsCreatingUnit(false);
                      }}
                      onCancel={() => {
                        setActiveUnitId(null);
                        setIsCreatingUnit(false);
                      }}
                    />
                  ) : (
                    <UnitList
                      onCreate={() => setIsCreatingUnit(true)}
                      onEdit={(id) => setActiveUnitId(id)}
                      onBack={() => setSubScreen('MAIN')}
                    />
                  )
                )}

                {subScreen === 'CREATE_STOCK_ITEM' && (
                  isCreatingItem || activeItemId ? (
                    <StockItemForm
                      itemId={activeItemId}
                      onSuccess={() => {
                        setActiveItemId(null);
                        setIsCreatingItem(false);
                      }}
                      onCancel={() => {
                        setActiveItemId(null);
                        setIsCreatingItem(false);
                      }}
                    />
                  ) : (
                    <StockItemList
                      onCreate={() => setIsCreatingItem(true)}
                      onEdit={(id) => setActiveItemId(id)}
                      onBack={() => setSubScreen('MAIN')}
                    />
                  )
                )}

                {subScreen === 'VOUCHER_PURCHASE' && (
                  isRecordingPurchase ? (
                    <PurchaseVoucherForm
                      onSuccess={() => {
                        setIsRecordingPurchase(false);
                      }}
                      onCancel={() => {
                        setIsRecordingPurchase(false);
                      }}
                    />
                  ) : (
                    <PurchaseVoucherList
                      onCreateClick={() => setIsRecordingPurchase(true)}
                    />
                  )
                )}

                {/* Other Sub-screens placeholder */}
                {subScreen !== 'CREATE_LEDGER' && subScreen !== 'ALTER_LEDGER' && subScreen !== 'CREATE_GROUP' && subScreen !== 'CREATE_UNIT' && subScreen !== 'CREATE_STOCK_ITEM' && subScreen !== 'VOUCHER_PURCHASE' && (
                  <div className="py-8 text-center text-zinc-500 border border-dashed border-zinc-850 rounded">
                    <div className="text-xs text-zinc-300 font-bold mb-1">
                      {subScreen.replace('VOUCHER_', 'Voucher ').replace('REPORT_', 'Report ')} Workspace
                    </div>
                    <div>This component screen will be fully completed in the next modules.</div>
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-850 pt-4 text-[9px] text-zinc-500 flex justify-between">
                <span>Active Company: {activeCompany?.name}</span>
                <span>Press <strong className="text-zinc-400">ESC</strong> to return to Gateway</span>
              </div>
            </div>
          )}

        </main>

        {/* BOTTOM HELP BAR */}
        <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-1.5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <div className="flex gap-4">
            <span>F1: Co. Select</span>
            <span>ESC: Back</span>
            <span>Ctrl+H: Home</span>
            <span>Ctrl+K: Search</span>
            <span>Ctrl+Q: Logout</span>
          </div>
          <div>
            <span>SmartERP v1.0.0</span>
          </div>
        </footer>

      </div>
    </KeyboardProvider>
  );
}
