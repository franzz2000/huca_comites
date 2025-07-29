import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import type { Reunion, Asistencia, Miembro } from '../types';

interface ReunionFormProps {
  open: boolean;
  onClose: () => void;
  grupoId: number;
  miembros: Miembro[]; 
  reunion?: Reunion | null;
  onSave: (reunion: Omit<Reunion, 'id' | 'grupo_id'> & { grupo_id: number }, asistencias: Omit<Asistencia, 'id' | 'reunion_id'>[]) => Promise<void>;
}

export const ReunionForm: React.FC<ReunionFormProps> = ({
  open,
  onClose,
  grupoId,
  miembros,
  reunion,
  onSave,
}) => {
  const [fecha, setFecha] = useState<Date | null>(reunion ? parse(reunion.fecha, 'yyyy-MM-dd', new Date()) : new Date());
  const [hora, setHora] = useState<Date | null>(
    reunion && reunion.hora ? parse(reunion.hora, 'HH:mm', new Date()) : parse('19:00', 'HH:mm', new Date())
  );
  const [ubicacion, setUbicacion] = useState(reunion?.ubicacion || '');
  const [descripcion, setDescripcion] = useState(reunion?.descripcion || '');
  const [asistencias, setAsistencias] = useState<Record<number, { estado: Asistencia['estado']; observaciones: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Filtrar miembros que estaban activos en la fecha de la reunión
  const miembrosActivos = useMemo(() => {
    if (!fecha) return [];
    
    const fechaReunion = fecha;
    return miembros.filter((miembro: Miembro) => {
      // Si no hay fecha de inicio, no incluir al miembro
      if (!miembro.fecha_inicio) return false;
      
      const fechaInicio = new Date(miembro.fecha_inicio);
      
      // Si la fecha de reunión es anterior a la fecha de inicio, no incluir
      if (fechaReunion < fechaInicio) return false;
      
      // Si hay fecha de fin y la reunión es posterior, no incluir
      if (miembro.fecha_fin) {
        const fechaFin = new Date(miembro.fecha_fin);
        if (fechaReunion > fechaFin) return false;
      }
      
      return true;
    });
  }, [miembros, fecha]);
  
  // Actualizar asistencias cuando cambian los miembros activos o la reunión
  useEffect(() => {
    // Solo actualizar si hay cambios en los miembros activos o en las asistencias de la reunión
    const hasAsistencias = reunion?.asistencias && reunion.asistencias.length > 0;
    
    // Crear un nuevo objeto de asistencias basado en el estado actual
    const nuevasAsistencias = { ...asistencias };
    let hasChanges = false;
    
    // Obtener IDs de miembros activos para verificación rápida
    const idsMiembrosActivos = new Set(miembrosActivos.map((m: Miembro) => m.persona_id));
    
    // 1. Eliminar asistencias de miembros que ya no están activos
    Object.keys(nuevasAsistencias).forEach(personaIdStr => {
      const personaId = Number(personaIdStr);
      if (!idsMiembrosActivos.has(personaId)) {
        delete nuevasAsistencias[personaId];
        hasChanges = true;
      }
    });
    
    // 2. Añadir o actualizar asistencias para miembros activos
    miembrosActivos.forEach((miembro: Miembro) => {
      const personaId = miembro.persona_id;
      
      // Si ya existe la asistencia, mantenerla
      if (nuevasAsistencias[personaId]) return;
      
      // Si hay asistencias de la reunión, buscar la existente
      if (hasAsistencias) {
        const asistenciaExistente = reunion.asistencias?.find(a => a.persona_id === personaId);
        if (asistenciaExistente) {
          nuevasAsistencias[personaId] = {
            estado: asistenciaExistente.estado,
            observaciones: asistenciaExistente.observaciones || ''
          };
          hasChanges = true;
          return;
        }
      }
      
      // Si no hay asistencia existente, crear una nueva
      nuevasAsistencias[personaId] = { 
        estado: 'no_asistio' as const, 
        observaciones: '' 
      };
      hasChanges = true;
    });
    
    // Solo actualizar el estado si hubo cambios
    if (hasChanges) {
      setAsistencias(nuevasAsistencias);
    }
  }, [miembrosActivos, reunion?.asistencias, asistencias]);

  // Inicializar datos del formulario cuando se abre o cambia la reunión
  useEffect(() => {
    if (reunion) {
      // Inicializar ubicación y descripción de la reunión existente
      setUbicacion(reunion.ubicacion || '');
      setDescripcion(reunion.descripcion || '');
      
      // Las asistencias se manejan en el otro useEffect que depende de miembrosActivos
      // para asegurar que siempre estén sincronizadas con los miembros activos
    } else {
      // Inicializar valores por defecto para nueva reunión
      setUbicacion('');
      setDescripcion('');
      
      // La inicialización de asistencias se maneja en el otro useEffect
    }
  }, [reunion]);

  const handleAsistenciaChange = (personaId: number, estado: Asistencia['estado']) => {
    setAsistencias(prev => ({
      ...prev,
      [personaId]: {
        ...prev[personaId],
        estado,
      },
    }));
  };

  const handleObservacionesChange = (personaId: number, observaciones: string) => {
    setAsistencias(prev => ({
      ...prev,
      [personaId]: {
        ...prev[personaId],
        observaciones,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fecha || !hora || !ubicacion) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      const fechaStr = format(fecha, 'yyyy-MM-dd');
      const horaStr = format(hora, 'HH:mm');
      
      const reunionData = {
        fecha: fechaStr,
        hora: horaStr,
        ubicacion,
        descripcion: descripcion || null,
        grupo_id: grupoId
      };

      console.log('Datos de la reunión a guardar:', {
        ...reunionData,
        asistencias: Object.entries(asistencias).map(([personaId, asistencia]) => ({
          persona_id: Number(personaId),
          estado: asistencia.estado,
          observaciones: asistencia.observaciones || null,
        }))
      });

      const asistenciasData = Object.entries(asistencias).map(([personaId, asistencia]) => {
        let asistio: boolean;
        if (asistencia.estado === 'asistio') {
          asistio = true;
        } else {
          asistio = false;
        }
        return {
          persona_id: Number(personaId),
          asistio,
          estado: asistencia.estado,
          observaciones: asistencia.observaciones ? asistencia.observaciones : undefined,
        };
      });

      console.log('Enviando datos al servidor', {
        reunion: reunionData,
        asistencias: asistenciasData
      });

      await onSave(reunionData, asistenciasData);
      onClose();
    } catch (error: unknown) {
      console.error('Error al guardar la reunión:', error);

      interface AxiosErrorResponse {
        response?: {
          status?: number;
          statusText?: string;
          data?: {
            error?: string;
            [key: string]: unknown;
          };
            headers?: Record<string, unknown>;
        }
      }

      const axiosError = error as AxiosErrorResponse;
      const errorMessage = axiosError?.response?.data?.error || 'Error al guardar la reunión';

      console.error('Detalles del error:',{
        status: axiosError?.response?.status,
        statusText: axiosError?.response?.statusText,
        data: axiosError?.response?.data,
        headers: axiosError?.response?.headers,
      })

      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogClose = (_event: React.SyntheticEvent | Event, reason: 'backdropClick' | 'escapeKeyDown') => {
    // Prevent closing on outside click
    if (reason === 'backdropClick') {
      return;
    }
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleDialogClose}
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={isSaving} // Prevent closing with escape key when saving
      aria-labelledby="reunion-dialog-title"
      aria-describedby="reunion-dialog-description"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="reunion-dialog-title">
          {reunion ? 'Editar Reunión' : 'Nueva Reunión'}
        </DialogTitle>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <DatePicker
                label="Fecha"
                value={fecha}
                onChange={(newValue) => setFecha(newValue)}
                format="dd/MM/yyyy"
                slotProps={{ textField: { required: true, fullWidth: true } }}
              />
              <TimePicker
                label="Hora"
                value={hora}
                onChange={(newValue) => setHora(newValue)}
                format="HH:mm"
                slotProps={{ textField: { required: true, fullWidth: true } }}
              />
              <TextField
                label="Ubicación"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                required
                fullWidth
                sx={{ gridColumn: '1 / -1' }}
              />
              <TextField
                label="Descripción"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                multiline
                rows={3}
                fullWidth
                sx={{ gridColumn: '1 / -1' }}
              />
            </Box>
          </LocalizationProvider>

          <Typography variant="h6" gutterBottom>
            Asistencia
            <Tooltip title="Haz clic en los iconos para cambiar el estado de asistencia">
              <IconButton size="small" sx={{ ml: 1, verticalAlign: 'middle' }}>
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Miembro</TableCell>
                  <TableCell align="center" width={200}>Asistencia</TableCell>
                  <TableCell>Observaciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {miembrosActivos.map((miembro: Miembro) => {
                  const asistencia = asistencias[miembro.persona_id] || { estado: 'no_asistio', observaciones: '' };
                  
                  return (
                    <TableRow key={miembro.persona_id}>
                      <TableCell>
                        {miembro.persona ? 
                          `${miembro.persona.nombre || ''} ${miembro.persona.primer_apellido || ''}${miembro.persona.segundo_apellido ? ' ' + miembro.persona.segundo_apellido : ''}` : 
                          `Usuario ${miembro.persona_id}`
                        }
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Tooltip title="Asistió">
                            <IconButton
                              size="small"
                              color={asistencia.estado === 'asistio' ? 'primary' : 'default'}
                              onClick={() => handleAsistenciaChange(miembro.persona_id, 'asistio')}
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="No asistió">
                            <IconButton
                              size="small"
                              color={asistencia.estado === 'no_asistio' ? 'error' : 'default'}
                              onClick={() => handleAsistenciaChange(miembro.persona_id, 'no_asistio')}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Con excusa">
                            <IconButton
                              size="small"
                              color={asistencia.estado === 'excusa' ? 'warning' : 'default'}
                              onClick={() => handleAsistenciaChange(miembro.persona_id, 'excusa')}
                            >
                              <HelpIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="Observaciones"
                          value={asistencia.observaciones || ''}
                          onChange={(e) => handleObservacionesChange(miembro.persona_id, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
