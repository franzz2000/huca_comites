export interface Grupo {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

export interface Miembro {
  id: number;
  persona_id: number;
  grupo_id: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  usuario?: Usuario;
}

export interface Reunion {
  id: number;
  grupo_id: number;
  fecha: string;
  descripcion: string;
  grupo?: Grupo;
}

export interface Asistencia {
  id: number;
  reunion_id: number;
  persona_id: number;
  asistio: boolean;
  usuario?: Usuario;
  reunion?: Reunion;
}
