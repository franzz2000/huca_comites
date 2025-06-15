import { useState, useEffect, useCallback } from 'react';
import { login as loginApi, logout as logoutApi, getCurrentUser } from '../../services/authService';
import type { User } from '../../services/authService';
import { AuthContext, type AuthProviderProps } from './types';

export const AuthProvider = ({ 
  children, 
  onLoginSuccess, 
  onLogout 
}: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to check auth status', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);


  const login = useCallback(async (email: string, password: string) => {
    try {
      const userData = await loginApi(email, password);
      setUser(userData);
      onLoginSuccess?.();
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [onLoginSuccess]);

  const logout = useCallback(() => {
    logoutApi();
    setUser(null);
    onLogout?.();
  }, [onLogout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
