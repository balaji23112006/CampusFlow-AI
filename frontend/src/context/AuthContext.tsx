import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import type { User, UserRole } from '../types';

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface PasswordPolicyStatus {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

export function checkPasswordPolicy(password: string): PasswordPolicyStatus {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password);

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid: hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar,
  };
}

export function validateEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (!clean || clean.includes(' ') || clean.indexOf('@') <= 0) return false;
  if (clean.split('@').length !== 2) return false;
  return EMAIL_REGEX.test(clean);
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password?: string, confirmPassword?: string, fullName?: string, role?: UserRole) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmNewPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_USER = 'campusflow_auth_user';
const LOCAL_STORAGE_KEY_TOKEN = 'campusflow_auth_token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAccessToken(session.access_token);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Student User',
            role: (session.user.user_metadata?.role as UserRole) || 'student',
            rollNumber: session.user.user_metadata?.roll_number || '',
            department: session.user.user_metadata?.department || ''
          });
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            setAccessToken(session.access_token);
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Student User',
              role: (session.user.user_metadata?.role as UserRole) || 'student',
              rollNumber: session.user.user_metadata?.roll_number || '',
              department: session.user.user_metadata?.department || ''
            });
          } else {
            setUser(null);
            setAccessToken(null);
          }
        });

        setLoading(false);
        return () => subscription.unsubscribe();
      } else {
        // Restore local authenticated session from token
        const storedUser = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
        const storedToken = localStorage.getItem(LOCAL_STORAGE_KEY_TOKEN);

        if (storedUser && storedToken) {
          try {
            // Verify session with backend /me endpoint
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.authenticated !== false && data.id) {
                const authUser: User = {
                  id: data.id,
                  email: data.email,
                  name: data.name,
                  role: data.role as UserRole,
                  rollNumber: data.roll_number || '',
                  department: data.department || ''
                };
                setUser(authUser);
                setAccessToken(storedToken);
              } else {
                localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
                localStorage.removeItem(LOCAL_STORAGE_KEY_TOKEN);
                setUser(null);
                setAccessToken(null);
              }
            } else {
              // Token invalid or expired
              localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
              localStorage.removeItem(LOCAL_STORAGE_KEY_TOKEN);
              setUser(null);
              setAccessToken(null);
            }
          } catch {
            setUser(null);
            setAccessToken(null);
          }
        } else {
          setUser(null);
          setAccessToken(null);
        }
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Front-end Pre-validation
    if (!validateEmailFormat(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (error) {
        throw new Error('Invalid email or password.');
      }
      if (data.session) {
        setAccessToken(data.session.access_token);
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
          name: data.session.user.user_metadata?.name || cleanEmail.split('@')[0],
          role: (data.session.user.user_metadata?.role as UserRole) || 'student'
        });
      }
    } else {
      // Backend Auth Endpoint
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.detail || 'Invalid email or password.');
      }

      const authenticatedUser: User = {
        id: resData.user.id,
        email: resData.user.email,
        name: resData.user.name,
        role: resData.user.role as UserRole,
        rollNumber: resData.user.roll_number || '',
        department: resData.user.department || ''
      };

      setUser(authenticatedUser);
      setAccessToken(resData.access_token);
      localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(authenticatedUser));
      localStorage.setItem(LOCAL_STORAGE_KEY_TOKEN, resData.access_token);
    }
  };

  const signup = async (
    email: string,
    password?: string,
    confirmPassword?: string,
    fullName?: string,
    role: UserRole = 'student'
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (!fullName || !fullName.trim()) {
      throw new Error('Please enter your full name.');
    }
    if (!validateEmailFormat(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Please enter a password.');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const policy = checkPasswordPolicy(password);
    if (!policy.isValid) {
      throw new Error('Password does not meet the required security requirements.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: fullName.trim(), role }
        }
      });
      if (error) throw new Error(error.message);
      if (data.session) {
        setAccessToken(data.session.access_token);
      }
    } else {
      // Real Backend Auth Registration
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          confirm_password: confirmPassword,
          full_name: fullName.trim(),
          role
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.detail || 'Registration failed.');
      }

      const newUser: User = {
        id: resData.user.id,
        email: resData.user.email,
        name: resData.user.name,
        role: resData.user.role as UserRole,
        rollNumber: resData.user.roll_number || '',
        department: resData.user.department || ''
      };

      setUser(newUser);
      setAccessToken(resData.access_token);
      localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(newUser));
      localStorage.setItem(LOCAL_STORAGE_KEY_TOKEN, resData.access_token);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string
  ) => {
    if (!currentPassword) {
      throw new Error('Please enter your current password.');
    }
    if (!newPassword) {
      throw new Error('Please enter your new password.');
    }
    if (newPassword === currentPassword) {
      throw new Error('New password must be different from your current password.');
    }
    if (newPassword !== confirmNewPassword) {
      throw new Error('New passwords do not match.');
    }

    const policy = checkPasswordPolicy(newPassword);
    if (!policy.isValid) {
      throw new Error('Password does not meet the required security requirements.');
    }

    const token = accessToken || localStorage.getItem(LOCAL_STORAGE_KEY_TOKEN);
    if (!token) {
      throw new Error('Not authenticated. Please log in first.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword
      })
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.detail || 'Failed to update password.');
    }

    // Successfully updated password -> clear session requiring re-login
    await logout();
  };

  const refreshProfile = async () => {
    const token = accessToken || localStorage.getItem(LOCAL_STORAGE_KEY_TOKEN);
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated !== false && data.id) {
          const authUser: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role as UserRole,
            rollNumber: data.roll_number || '',
            department: data.department || ''
          };
          setUser(authUser);
          localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(authUser));
        }
      }
    } catch (_) {}
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TOKEN);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, signup, changePassword, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
