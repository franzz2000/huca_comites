import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ReunionForm } from './ReunionForm';
import { 
  getReunionesByGrupo, 
  deleteReunion, 
  updateReunion, 
  createReunion, 
  saveAsistencias 
} from '../services/reunionesApi';
import type { Reunion, Miembro, Asistencia } from '../types';

interface ReunionesProps {
  grupoId: number;
  miembros: Miembro[];
  grupoNombre: string;
}

export const Reuniones: React.FC<ReunionesProps> = ({ grupoId, miembros, grupoNombre }) => {
  const [reuniones, setReuniones] = useState<Array<Reunion & { asistencias?: Asistencia[] }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reunionEditando, setReunionEditando] = useState<Reunion | null>(null);
  const [reunionEliminar, setReunionEliminar] = useState<Reunion | null>(null);
  const [isEliminando, setIsEliminando] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const mostrarMensaje = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const cargarReuniones = useCallback(async () => {
    if (!grupoId) return;
    
    try {
      setIsLoading(true);
      const data = await getReunionesByGrupo(grupoId);
      const reunionesConAsistencias = data.map(reunion => ({
        ...reunion,
        asistencias: reunion.asistencias || []
      }));
      setReuniones(reunionesConAsistencias);
    } catch (error) {
      console.error('Error al cargar reuniones:', error);
      mostrarMensaje('Error al cargar las reuniones', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [grupoId]);

  useEffect(() => {
    cargarReuniones();
  }, [cargarReuniones]); // Now cargarReuniones is properly memoized and includes all dependencies

  const handleOpenForm = (reunion?: Reunion & { asistencias?: Asistencia[] }) => {
    if (reunion) {
      setReunionEditando(reunion);
    } else {
      setReunionEditando(null);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setReunionEditando(null);
  };

  const handleGuardarReunion = async (
    reunionData: Omit<Reunion, 'id' | 'grupo_id'>, 
    asistencias: Omit<Asistencia, 'id' | 'reunion_id'>[]
  ): Promise<void> => {
    console.log('Iniciando guardado de reunión...', { reunionData, asistencias });
    
    try {
      if (reunionEditando?.id) {
        console.log('Actualizando reunión existente ID:', reunionEditando.id);
        // For updating, use the existing reunion data
        await updateReunion(reunionEditando.id, { 
          ...reunionData,
          grupo_id: grupoId // Ensure grupo_id is included in updates
        });
        console.log('Reunión actualizada, guardando asistencias...');
        await saveAsistencias(reunionEditando.id, asistencias);
      } else {
        console.log('Creando nueva reunión...');
        // For new meetings, include grupo_id in the initial creation
        const nuevaReunion = await createReunion({ 
          ...reunionData,
          grupo_id: grupoId,
          // Ensure all required fields are included
          fecha: reunionData.fecha,
          hora: reunionData.hora,
          ubicacion: reunionData.ubicacion,
          descripcion: reunionData.descripcion || null
        });
        
        console.log('Reunión creada, respuesta:', nuevaReunion);
        
        // Only save attendances after successful meeting creation
        if (nuevaReunion?.id) {
          console.log('Guardando asistencias para reunión ID:', nuevaReunion.id);
          await saveAsistencias(nuevaReunion.id, asistencias);
        } else {
          const errorMsg = 'No se pudo obtener el ID de la reunión recién creada';
          console.error(errorMsg, nuevaReunion);
          throw new Error(errorMsg);
        }
      }
      
      console.log('Recargando lista de reuniones...');
      await cargarReuniones();
      
      const successMessage = reunionEditando 
        ? 'Reunión actualizada correctamente' 
        : 'Reunión creada correctamente';
      
      console.log(successMessage);
      mostrarMensaje(successMessage, 'success');
      
      console.log('Cerrando formulario...');
      handleCloseForm();
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? `Error al guardar la reunión: ${error.message}`
        : 'Error desconocido al guardar la reunión';
      
      console.error('Error completo:', error);
      console.error(errorMessage);
      
      // Mostrar mensaje de error más descriptivo
      mostrarMensaje(errorMessage, 'error');
      
      // Relanzar el error para que pueda ser manejado por el componente padre si es necesario
      throw error;
    }
  };

  const handleEliminarClick = (reunion: Reunion & { asistencias?: Asistencia[] }) => {
    setReunionEliminar(reunion);
  };

  const handleConfirmarEliminar = async () => {
    if (!reunionEliminar) return;
    
    try {
      setIsEliminando(true);
      await deleteReunion(reunionEliminar.id!);
      await cargarReuniones();
      mostrarMensaje('Reunión eliminada correctamente', 'success');
      setReunionEliminar(null);
    } catch (error) {
      console.error('Error al eliminar la reunión:', error);
      mostrarMensaje('Error al eliminar la reunión', 'error');
    } finally {
      setIsEliminando(false);
    }
  };



  const getEstadoAsistencia = (reunion: Reunion & { asistencias?: Asistencia[] }) => {
    if (!reunion.asistencias || reunion.asistencias.length === 0) {
      return 'Sin registrar';
    }
    
    const totalAsistentes = reunion.asistencias.filter(a => a.estado === 'asistio').length;
    const excusas = reunion.asistencias.filter(a => a.estado === 'excusa').length;
    
    return `${totalAsistentes} asistieron, ${excusas} con excusa`;
  };

  const getTotalAsistentes = (reunion: Reunion & { asistencias?: Asistencia[] }): number => {
    if (!reunion.asistencias) return 0;
    return reunion.asistencias.filter(a => a.estado === 'asistio').length;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Reuniones del grupo: {grupoNombre}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Nueva Reunión
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : reuniones.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No hay reuniones programadas para este grupo.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
            sx={{ mt: 2 }}
          >
            Programar una reunión
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Hora</TableCell>
                <TableCell>Ubicación</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Asistencia</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reuniones.map((reunion) => (
                <TableRow key={reunion.id}>
                  <TableCell>
                    {format(parseISO(reunion.fecha), 'PPP', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {reunion.hora}
                  </TableCell>
                  <TableCell>{reunion.ubicacion}</TableCell>
                  <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {reunion.descripcion || 'Sin descripción'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={getEstadoAsistencia(reunion)}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PeopleIcon color="action" fontSize="small" />
                        <Typography variant="body2">
                          {getTotalAsistentes(reunion)}/{miembros.length} miembros
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenForm(reunion)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleEliminarClick(reunion)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Formulario de reunión */}
      <ReunionForm
        open={isFormOpen}
        onClose={handleCloseForm}
        grupoId={grupoId}
        miembros={miembros}
        reunion={reunionEditando}
        onSave={handleGuardarReunion}
      />

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={!!reunionEliminar}
        onClose={() => !isEliminando && setReunionEliminar(null)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar la reunión del {reunionEliminar ? format(parseISO(reunionEliminar.fecha), 'PPP', { locale: es }) : ''}?
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setReunionEliminar(null)} 
            disabled={isEliminando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarEliminar}
            color="error"
            disabled={isEliminando}
            startIcon={isEliminando ? <CircularProgress size={20} /> : null}
          >
            {isEliminando ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensajes */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
