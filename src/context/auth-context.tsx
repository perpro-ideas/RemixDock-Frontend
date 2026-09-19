'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, LoginPayload, RegisterPayload, AuthResponse } from '@/types/auth.types';
import { apiFetch, ApiClientError } from '@/lib/api-client';

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Refresco silencioso de sesión mediante la cookie httpOnly gestionada por el backend.
   * Si la cookie es válida, restaura el token y el perfil de usuario en memoria.
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      // 1. Intentar refrescar tokens mediante cookie httpOnly
      const authData = await apiFetch<AuthResponse>('/auth/refresh', {
        method: 'POST',
      });

      if (authData.accessToken && authData.user) {
        setAccessToken(authData.accessToken);
        setUser(authData.user);
        return true;
      }

      // 2. Si refresh no incluye el usuario completo, consultar GET /auth/me con el nuevo token
      if (authData.accessToken) {
        setAccessToken(authData.accessToken);
        const userProfile = await apiFetch<User>('/auth/me', {
          method: 'GET',
          token: authData.accessToken,
        });
        setUser(userProfile);
        return true;
      }

      return false;
    } catch {
      // Si el refresco falla (sin cookie o expirada), intentar consultar /auth/me directamente
      try {
        const userProfile = await apiFetch<User>('/auth/me', {
          method: 'GET',
        });
        if (userProfile && userProfile.id) {
          setUser(userProfile);
          return true;
        }
      } catch {
        // Sesión inactiva o no autenticado
      }

      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, []);

  // Comprobación inicial de sesión al montar el proveedor
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        await refreshSession();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  /**
   * Inicio de sesión: envía credenciales y guarda el accessToken y datos del usuario en memoria.
   */
  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    const authData = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setAccessToken(authData.accessToken);
    setUser(authData.user);
  }, []);

  /**
   * Registro de usuario: crea la cuenta mediante el endpoint público de registro.
   */
  const register = useCallback(async (payload: RegisterPayload): Promise<User> => {
    const createdUser = await apiFetch<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return createdUser;
  }, []);

  /**
   * Cierre de sesión: invalida la sesión en el backend y limpia el estado en memoria.
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiFetch<{ message: string }>('/auth/logout', {
        method: 'POST',
        token: accessToken,
      });
    } catch (err) {
      // Si el logout remoto falla por token expirado, continuamos la limpieza local
      if (err instanceof ApiClientError && err.statusCode === 401) {
        // Ignorar 401 en logout
      }
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, [accessToken]);

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook de acceso al contexto de autenticación.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
