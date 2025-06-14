export interface Usuario {
    id?: number;
    nombre: string;
    primer_apellido: string;
    segundo_apellido?: string | null;
    email: string;
    telefono?: string | null;
    puesto_trabajo?: string | null;
    observaciones?: string | null;
}

export interface Grupo {
    id?: number;
    nombre: string;
    descripcion?: string | null;
}

export interface Miembro {
    id?: number;
    persona_id: number;
    grupo_id: number;
    fecha_inicio?: string;
    fecha_fin?: string | null;
    persona?: Usuario;
    activo?: boolean;
}

export interface Reunion {
    id?: number;
    grupo_id: number;
    fecha: string;
    hora: string;
    ubicacion: string;
    descripcion?: string | null;
    asistencias?: Asistencia[];
}

export interface Asistencia {
    id?: number;
    reunion_id: number;
    persona_id: number;
    estado: 'asistio' | 'no_asistio' | 'excusa';
    observaciones?: string | null;
    persona?: Usuario;
}
