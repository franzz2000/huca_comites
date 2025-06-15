import { createContext } from 'react';
import type { User } from '../../services/authService';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
  onLoginSuccess?: () => void;
  onLogout?: () => void;
}
