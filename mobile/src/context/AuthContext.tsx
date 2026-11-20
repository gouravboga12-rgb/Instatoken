import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: 'patient' | 'hospital';
  avatar?: string;
  hospitalId?: string;
  hospitalName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  sendOtp: (phone: string, mode?: 'login' | 'signup') => Promise<{ success: boolean; message: string; notFound?: boolean; alreadyExists?: boolean }>;
  verifyOtp: (phone: string, otp: string, name?: string, email?: string, mode?: 'login' | 'signup') => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  hospitalLogin: (phone: string, otp: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  switchRole: (role: 'patient' | 'hospital') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Google Cloud Console OAuth 2.0 Credentials:
// Web Client ID: used by Google Play Services to generate the idToken
export const GOOGLE_WEB_CLIENT_ID = '775908901707-28ldlr19llkdrok9h8g0lethcunk6tf2.apps.googleusercontent.com';
// Android Client ID: linked to in.instatoken.app with SHA-1
export const GOOGLE_ANDROID_CLIENT_ID = '775908901707-k8b5tjhfvmuirpo95t136iraft9ls75j.apps.googleusercontent.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
    } catch (e) {
      console.warn('Google Signin configure error:', e);
    }
    loadPersistedAuth();
  }, []);

  const loadPersistedAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('auth_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to load stored auth:', e);
    } finally {
      setLoading(false);
    }
  };

  const persistSession = async (authToken: string, authUser: User) => {
    setToken(authToken);
    setUser(authUser);
    await AsyncStorage.setItem('auth_token', authToken);
    await AsyncStorage.setItem('auth_user', JSON.stringify(authUser));
  };

  const sendOtp = async (phone: string, mode: 'login' | 'signup' = 'login') => {
    try {
      const clean10 = phone.replace(/\D/g, '').slice(-10);
      const res = await apiClient.post('/auth/sms/send-otp', {
        phone: clean10,
        purpose: 'customer_auth',
        mode,
      });
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Unable to send OTP. Please check your network.',
        notFound: Boolean(err.response?.data?.notFound),
        alreadyExists: Boolean(err.response?.data?.alreadyExists),
      };
    }
  };

  const verifyOtp = async (phone: string, otp: string, name?: string, email?: string, mode: 'login' | 'signup' = 'login') => {
    try {
      const clean10 = phone.replace(/\D/g, '').slice(-10);
      const res = await apiClient.post('/customers/otp-auth', {
        phone: clean10,
        otp,
        name,
        email,
        mode,
      });
      if (res.data.success && res.data.customer) {
        const u: User = {
          id: res.data.customer.id,
          name: res.data.customer.name,
          phone: res.data.customer.phone || clean10,
          email: res.data.customer.email,
          role: 'patient',
          avatar: res.data.customer.avatar,
        };
        await persistSession(res.data.token || 'demo-token', u);
        return { success: true, message: 'Logged in successfully' };
      }
      return { success: false, message: res.data.message || 'OTP Verification failed' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Verification failed. Please check OTP.',
      };
    }
  };

  const loginWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const profile = response.data?.user || (response as any).user;
      if (!profile || !profile.email) {
        return { success: false, message: 'No Google account selected' };
      }

      // Authenticate with InstaToken backend
      const res = await apiClient.post('/customers/login', {
        emailOrPhone: profile.email,
        isGoogleAuth: true,
        googleProfile: {
          name: profile.name,
          email: profile.email,
          picture: profile.photo,
        },
      });

      if (res.data.success && res.data.customer) {
        const u: User = {
          id: res.data.customer.id,
          name: res.data.customer.name,
          email: res.data.customer.email,
          phone: res.data.customer.phone,
          role: 'patient',
          avatar: profile.photo || res.data.customer.avatar,
        };
        await persistSession(res.data.token || 'google-token', u);
        return { success: true, message: 'Signed in with Google successfully' };
      }
      return { success: false, message: res.data.message || 'Google login failed on server' };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, message: 'Sign in cancelled' };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return { success: false, message: 'Sign in already in progress' };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { success: false, message: 'Google Play Services not available or outdated' };
      }
      return { success: false, message: error.message || 'Google sign-in error' };
    }
  };

  const hospitalLogin = async (phone: string, otp: string) => {
    try {
      const clean10 = phone.replace(/\D/g, '').slice(-10);
      const res = await apiClient.post('/auth/hospital-otp-login', {
        phone: clean10,
        otp,
      });
      if (res.data.success && res.data.user) {
        const u: User = {
          id: res.data.user.id,
          name: res.data.user.name,
          phone: res.data.user.phone || clean10,
          email: res.data.user.email,
          role: 'hospital',
          hospitalId: res.data.user.hospitalId,
          hospitalName: res.data.user.hospitalName,
        };
        await persistSession(res.data.token, u);
        return { success: true, message: 'Hospital login successful' };
      }
      return { success: false, message: res.data.message || 'Hospital login failed' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please verify credentials.',
      };
    }
  };

  const logout = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // ignore
    }
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  const switchRole = (role: 'patient' | 'hospital') => {
    if (user) {
      const updated = { ...user, role };
      setUser(updated);
      AsyncStorage.setItem('auth_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        sendOtp,
        verifyOtp,
        loginWithGoogle,
        hospitalLogin,
        logout,
        switchRole,
      }}
    >
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
