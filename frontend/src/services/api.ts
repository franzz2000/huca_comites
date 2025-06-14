import axios from 'axios';
import type { Grupo, Usuario, Miembro, Reunion, Asistencia } from '../types';

// URL directa al backend
const API_URL = 'http://localhost:3001';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Tipos para las respuestas de la API
interface ApiResponse<T> {
    data: T;
}

// Grupos
export const getGrupos = (): Promise<ApiResponse<Grupo[]>> => api.get('/api/grupos');
export const getGrupo = (id: number): Promise<ApiResponse<Grupo>> => api.get(`/api/grupos/${id}`);
export const createGrupo = (data: Omit<Grupo, 'id'>): Promise<ApiResponse<Grupo>> => api.post('/api/grupos', data);
export const updateGrupo = (id: number, data: Partial<Grupo>): Promise<ApiResponse<Grupo>> => api.put(`/api/grupos/${id}`, data);
export const deleteGrupo = (id: number): Promise<ApiResponse<void>> => api.delete(`/api/grupos/${id}`);

// Usuarios
export const getUsuarios = (): Promise<ApiResponse<Usuario[]>> => api.get('/api/usuarios');
export const getUsuario = (id: number): Promise<ApiResponse<Usuario>> => api.get(`/api/usuarios/${id}`);
export const createUsuario = (data: Omit<Usuario, 'id'>): Promise<ApiResponse<Usuario>> => api.post('/api/usuarios', data);
export const updateUsuario = (id: number, data: Partial<Usuario>): Promise<ApiResponse<Usuario>> => api.put(`/api/usuarios/${id}`, data);
export const deleteUsuario = (id: number): Promise<ApiResponse<void>> => api.delete(`/api/usuarios/${id}`);

// Miembros
export const getMiembros = (grupoId?: number): Promise<ApiResponse<Miembro[]>> => 
    grupoId ? api.get(`/api/miembros?grupoId=${grupoId}`) : api.get('/api/miembros');
export const createMiembro = (data: Omit<Miembro, 'id'>): Promise<ApiResponse<Miembro>> => 
    api.post('/api/miembros', data);
export const deleteMiembro = (id: number): Promise<ApiResponse<void>> => 
    api.delete(`/api/miembros/${id}`);

// Reuniones
export const getReuniones = (grupoId?: number): Promise<ApiResponse<Reunion[]>> => 
    grupoId ? api.get(`/api/reuniones?grupoId=${grupoId}`) : api.get('/api/reuniones');
export const getReunion = (id: number): Promise<ApiResponse<Reunion>> => 
    api.get(`/api/reuniones/${id}`);
export const createReunion = (data: Omit<Reunion, 'id'>): Promise<ApiResponse<Reunion>> => 
    api.post('/api/reuniones', data);
export const updateReunion = (id: number, data: Partial<Reunion>): Promise<ApiResponse<Reunion>> => 
    api.put(`/api/reuniones/${id}`, data);
export const deleteReunion = (id: number): Promise<ApiResponse<void>> => 
    api.delete(`/api/reuniones/${id}`);

// Asistencia
export const getAsistencias = (reunionId: number): Promise<ApiResponse<Asistencia[]>> => 
    api.get(`/api/reuniones/${reunionId}/asistencia`);
export const updateAsistencia = (reunionId: number, data: { persona_id: number; asistio: boolean }[]): Promise<ApiResponse<Asistencia[]>> => 
    api.post(`/api/reuniones/${reunionId}/asistencia`, data);
