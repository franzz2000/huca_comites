import axios from 'axios';
import type { Reunion, Asistencia } from '../types';

const API_URL = 'http://localhost:3001/api';

export const getReunionesByGrupo = async (grupoId: number): Promise<Reunion[]> => {
  const response = await axios.get(`${API_URL}/reuniones?grupoId=${grupoId}`);
  return response.data;
};

export const getReunion = async (id: number): Promise<Reunion> => {
  const response = await axios.get(`${API_URL}/reuniones/${id}`);
  return response.data;
};

interface ApiError extends Error {
  response?: {
    data?: {
      error?: string;
      message?: string;
      [key: string]: string | number | boolean | null | undefined; // Allow other properties with specific types
    };
    status?: number;
    statusText?: string;
  };
  status?: number;
  statusText?: string;
}

export const createReunion = async (reunion: Omit<Reunion, 'id'>): Promise<Reunion> => {
  try {
    console.log('Sending request to create reunion:', {
      url: `${API_URL}/reuniones`,
      data: reunion,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const response = await axios.post(`${API_URL}/reuniones`, reunion, {
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw for any status code
    });
    
    console.log('Create reunion response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });
    
    if (response.status >= 400) {
      const errorMessage = response.data?.error || 
                         response.data?.message || 
                         `Error ${response.status}: ${response.statusText}`;
      console.error('API Error:', errorMessage);
      throw new Error(errorMessage);
    }
    
    if (!response.data) {
      console.error('No data in response');
      throw new Error('No se recibieron datos en la respuesta del servidor');
    }
    
    return response.data;
  } catch (error: unknown) {
    const err = error as ApiError;
    console.error('Error in createReunion:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      stack: err.stack
    });
    
    // Improve error message for network errors
    if (err.message === 'Network Error') {
      throw new Error('No se pudo conectar al servidor. Verifica tu conexión a internet.');
    }
    
    // Re-throw with a more descriptive message
    throw new Error(err.response?.data?.message || err.message || 'Error desconocido al crear la reunión');
  }
};

export const updateReunion = async (id: number, reunion: Partial<Reunion>): Promise<Reunion> => {
  const response = await axios.put(`${API_URL}/reuniones/${id}`, reunion);
  return response.data;
};

export const deleteReunion = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/reuniones/${id}`);
};

export const saveAsistencias = async (reunionId: number, asistencias: Omit<Asistencia, 'id' | 'reunion_id'>[]): Promise<Asistencia[]> => {
  const response = await axios.post(`${API_URL}/reuniones/${reunionId}/asistencias`, { asistencias });
  return response.data;
};
