import { useState, useEffect } from 'react';
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

  // Inicializar asistencias cuando se abre el formulario o cambia la reunión
  useEffect(() => {
    if (reunion?.asistencias) {
      const asistenciasIniciales = reunion.asistencias.reduce((acc, a) => ({
        ...acc,
        [a.persona_id]: {
          estado: a.estado,
          observaciones: a.observaciones || '',
        },
      }), {});
      setAsistencias(asistenciasIniciales);
    } else {
      // Inicializar asistencias para todos los miembros como 'no_asistio'
      const asistenciasIniciales = miembros.reduce((acc, miembro) => ({
        ...acc,
        [miembro.persona_id]: {
          estado: 'no_asistio' as const,
          observaciones: '',
        },
      }), {});
      setAsistencias(asistenciasIniciales);
    }
  }, [reunion, miembros]);

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

      const asistenciasData = Object.entries(asistencias).map(([personaId, asistencia]) => ({
        persona_id: Number(personaId),
        estado: asistencia.estado,
        observaciones: asistencia.observaciones || null,
      }));

      await onSave(reunionData, asistenciasData);
      onClose();
    } catch (error: unknown) {
      console.error('Error al guardar la reunión:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar la reunión';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogClose = (_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
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
                {miembros.map((miembro) => {
                  const asistencia = asistencias[miembro.persona_id] || { estado: 'no_asistio', observaciones: '' };
                  
                  return (
                    <TableRow key={miembro.persona_id}>
                      <TableCell>
                        {`${miembro.persona.nombre} ${miembro.persona.primer_apellido}${miembro.persona.segundo_apellido ? ' ' + miembro.persona.segundo_apellido : ''}`}
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
