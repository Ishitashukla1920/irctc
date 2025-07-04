import { useState, useEffect, createContext, useContext } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, phone?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('railway_token');
    const userData = localStorage.getItem('railway_user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Invalid user data in localStorage');
        localStorage.removeItem('railway_token');
        localStorage.removeItem('railway_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData, profile } = response.data;
      
      const userWithProfile = {
        ...userData,
        ...profile
      };
      
      localStorage.setItem('railway_token', access_token);
      localStorage.setItem('railway_user', JSON.stringify(userWithProfile));
      setUser(userWithProfile);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (email: string, password: string, full_name: string, phone?: string) => {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        full_name,
        phone
      });
      
      const { session, user: userData } = response.data;
      
      if (session) {
        const userWithProfile = {
          ...userData,
          full_name,
          phone
        };
        
        localStorage.setItem('railway_token', session.access_token);
        localStorage.setItem('railway_user', JSON.stringify(userWithProfile));
        setUser(userWithProfile);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('railway_token');
    localStorage.removeItem('railway_user');
    setUser(null);
  };

  return {
    user,
    login,
    register,
    logout,
    loading
  };
};

export { AuthContext };