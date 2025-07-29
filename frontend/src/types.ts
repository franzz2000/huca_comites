export interface Usuario {
    id?: number;
    nombre: string;
    primer_apellido: string;
    segundo_apellido?: string | null;
    dni?: string | null;
    email: string;
    telefono?: string | null;
    puesto_trabajo?: string | null;
    observaciones?: string | null;
    es_admin?: boolean;
    activo?: boolean;
}

export interface Grupo {
    id?: number;
    nombre: string;
    descripcion?: string | null;
    totalReuniones?: number;
    asistenciasUsuario?: number;
}

export interface Miembro {
    id?: number;
    persona_id: number;
    grupo_id: number;
    fecha_inicio?: string; //format 'YYYY-MM-DD'
    fecha_fin?: string | null; //format 'YYYY-MM-DD'
    persona?: Usuario;
    activo?: boolean;
    estadisticas?: {
        totalReuniones: number;
        asistencias: number;
        excusas: number;
        inasistencias: number;
    };
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
    asistio: boolean;
    estado?: string;
    observaciones?: string;
    fecha_creacion?: string;
    updated_at?: string;
    persona?: Usuario;
}
