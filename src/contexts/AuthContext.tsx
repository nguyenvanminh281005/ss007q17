import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import type { AuthUser, AuthContextType, Permission } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      if (password) {
        await authService.signInWithEmail(email, password);
      } else {
        // Assume email is actually account number for student login
        await authService.signInWithAccount(email);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithAccount = async (account: string) => {
    setLoading(true);
    try {
      const authUser = await authService.signInWithAccount(account);
      setUser(authUser);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    return authService.hasPermission(user, permission);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    loginWithGoogle,
    loginWithAccount,
    logout,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
