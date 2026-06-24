import { create } from 'zustand';

interface User {
  id: string;
  email: string;
}

interface Company {
  id: string;
  name: string;
  address: string;
  gstNumber: string | null;
  financialYearStart: string;
  state: string;
  contactInfo: string | null;
}

interface AppState {
  token: string | null;
  user: User | null;
  activeCompany: Company | null;
  setSession: (token: string | null, user: User | null) => void;
  setActiveCompany: (company: Company | null) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => {
  // Safe extraction for SSR
  const getLocalStorage = (key: string): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  };

  const setLocalStorage = (key: string, value: string | null) => {
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    }
  };

  // Initial state load
  const initialToken = getLocalStorage('token');
  const initialUserJson = getLocalStorage('user');
  const initialUser = initialUserJson ? JSON.parse(initialUserJson) : null;
  const initialCompanyJson = getLocalStorage('activeCompany');
  const initialCompany = initialCompanyJson ? JSON.parse(initialCompanyJson) : null;

  return {
    token: initialToken,
    user: initialUser,
    activeCompany: initialCompany,
    setSession: (token, user) => {
      setLocalStorage('token', token);
      setLocalStorage('user', user ? JSON.stringify(user) : null);
      set({ token, user });
    },
    setActiveCompany: (company) => {
      setLocalStorage('activeCompany', company ? JSON.stringify(company) : null);
      set({ activeCompany: company });
    },
    logout: () => {
      setLocalStorage('token', null);
      setLocalStorage('user', null);
      setLocalStorage('activeCompany', null);
      set({ token: null, user: null, activeCompany: null });
    },
  };
});
