import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface User {
  id: number;
  email: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  token: string;
}

// Helper function to get the current user from localStorage
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Helper function to get the auth token
export const getAuthToken = (): string | null => {
  const user = getCurrentUser();
  return user?.token || null;
};

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const userData = {
      ...response.data.user,
      token: response.data.token
    };
    
    // Save user data to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
    }
    
    return userData;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Error al iniciar sesión');
    }
    throw new Error('Error de conexión');
  }
};

export const register = async (
  email: string, 
  password: string, 
  nombre: string, 
  primerApellido: string
): Promise<User> => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      nombre,
      primer_apellido: primerApellido
    });
    
    const userData = {
      ...response.data.user,
      token: response.data.token
    };
    
    // Save user data to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
    }
    
    return userData;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Error al registrar el usuario');
    }
    throw new Error('Error de conexión');
  }
};

// Logout function
export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};
