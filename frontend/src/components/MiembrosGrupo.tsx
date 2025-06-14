import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    IconButton,
    TextField,
    Autocomplete,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Snackbar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    PersonAdd as PersonAddIcon,
    Save as SaveIcon,
    Close as CloseIcon 
} from '@mui/icons-material';
import { getUsuarios, getMiembros, createMiembro, updateMiembro } from '../services/api'; // Removed unused deleteMiembro
import type { Usuario, Miembro } from '../types';

interface MiembrosGrupoProps {
    open: boolean;
    onClose: () => void;
    grupoId: number | null;
    grupoNombre: string;
    onMiembroAgregado?: () => void;
}

interface MiembroEdicion {
    id: number;
    fecha_inicio: Date | null;
    fecha_fin: Date | null;
    activo: boolean;
}

interface SnackbarState {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
}

export const MiembrosGrupo = ({ open, onClose, grupoId, grupoNombre, onMiembroAgregado }: MiembrosGrupoProps) => {
    // State for component data
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [miembros, setMiembros] = useState<Miembro[]>([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
    const [cargando, setCargando] = useState(false);
    const [edicionAbierta, setEdicionAbierta] = useState(false);
    const [editandoMiembro, setEditandoMiembro] = useState<MiembroEdicion | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarState>({ 
        open: false, 
        message: '', 
        severity: 'info' 
    });

    // Helper functions
    const getNombreCompleto = (usuario: Usuario) => {
        return `${usuario.nombre || ''} ${usuario.primer_apellido || ''}${usuario.segundo_apellido ? ' ' + usuario.segundo_apellido : ''}`.trim();
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleError = (error: unknown, defaultMessage = 'Ha ocurrido un error') => {
        console.error(error);
        let message = defaultMessage;
        
        if (error instanceof Error) {
            message = error.message;
        } else if (error && typeof error === 'object' && 'message' in error) {
            message = String(error.message);
        }
        
        setSnackbar({
            open: true,
            message,
            severity: 'error'
        });
    };

    // Data fetching
    const cargarUsuarios = useCallback(async () => {
        try {
            const { data } = await getUsuarios();
            setUsuarios(data);
        } catch (error) {
            handleError(error, 'Error al cargar la lista de usuarios');
        }
    }, []);

    const cargarMiembros = useCallback(async () => {
        if (!grupoId) return;
        
        try {
            setCargando(true);
            // Fetch only active members
            const { data } = await getMiembros(grupoId, true);
            setMiembros(data);
        } catch (error) {
            handleError(error, 'Error al cargar los miembros del grupo');
        } finally {
            setCargando(false);
        }
    }, [grupoId]);

    // Initial data load
    useEffect(() => {
        const cargarDatos = async () => {
            await Promise.all([cargarUsuarios(), cargarMiembros()]);
        };

        if (open && grupoId) {
            cargarDatos();
        }
    }, [open, grupoId, cargarUsuarios, cargarMiembros]);

    // Member management
    const handleAgregarMiembro = async () => {
        if (!usuarioSeleccionado?.id || !grupoId) return;

        try {
            await createMiembro({
                grupo_id: grupoId,
                persona_id: usuarioSeleccionado.id,
                fecha_inicio: new Date().toISOString().split('T')[0]
            });

            await cargarMiembros();
            setUsuarioSeleccionado(null);
            
            if (onMiembroAgregado) {
                onMiembroAgregado();
            }

            setSnackbar({
                open: true,
                message: 'Miembro agregado correctamente',
                severity: 'success'
            });
        } catch (error) {
            handleError(error, 'Error al agregar el miembro');
        }
    };

    const handleAbrirEdicion = (miembro: Miembro) => {
        setEditandoMiembro({
            id: miembro.id!,
            fecha_inicio: miembro.fecha_inicio ? new Date(miembro.fecha_inicio) : new Date(),
            fecha_fin: miembro.fecha_fin ? new Date(miembro.fecha_fin) : null,
            activo: !miembro.fecha_fin
        });
        setEdicionAbierta(true);
    };

    const handleCerrarEdicion = () => {
        setEdicionAbierta(false);
        setEditandoMiembro(null);
    };

    const handleEnviarEdicion = async () => {
        if (!editandoMiembro) return;
        
        try {
            setGuardando(true);
            const fechaInicio = editandoMiembro.fecha_inicio || new Date();
            const fechaFin = editandoMiembro.fecha_fin;
            
            await updateMiembro(editandoMiembro.id, {
                fecha_inicio: fechaInicio.toISOString().split('T')[0],
                fecha_fin: fechaFin ? fechaFin.toISOString().split('T')[0] : null
            });
            
            await cargarMiembros();
            handleCerrarEdicion();
            
            setSnackbar({
                open: true,
                message: 'Miembro actualizado correctamente',
                severity: 'success'
            });
        } catch (error) {
            handleError(error, 'Error al actualizar el miembro');
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminarMiembro = async (miembroId: number) => {
        if (!window.confirm('¿Está seguro de dar de baja a este miembro del grupo? Se establecerá la fecha de fin al día actual.')) return;
        
        try {
            console.log(`Intentando dar de baja al miembro con ID: ${miembroId}`);
            
            // En lugar de eliminar, actualizamos la membresía estableciendo la fecha de fin a hoy
            const fechaHoy = new Date().toISOString().split('T')[0];
            console.log('Estableciendo fecha_fin a:', fechaHoy);
            
            const response = await updateMiembro(miembroId, {
                fecha_fin: fechaHoy,
                activo: false
            });
            
            console.log('Respuesta del servidor:', response);
            
            await cargarMiembros();
            
            if (onMiembroAgregado) {
                onMiembroAgregado();
            }
            
            setSnackbar({
                open: true,
                message: 'Miembro dado de baja correctamente',
                severity: 'success'
            });
        } catch (error: unknown) {
            console.error('Error al dar de baja al miembro:', error);
            handleError(error, 'Error al dar de baja al miembro');
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Miembros del grupo: {grupoNombre}</Typography>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box mb={3} display="flex" alignItems="center">
                        <Autocomplete
                            options={usuarios.filter(usuario => {
                                // Show user if they don't have an active membership in this group
                                return !miembros.some(m => 
                                    m.persona_id === usuario.id && 
                                    m.activo === true
                                );
                            })}
                            getOptionLabel={(usuario) => getNombreCompleto(usuario)}
                            value={usuarioSeleccionado}
                            onChange={(_, value) => setUsuarioSeleccionado(value)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Agregar miembro"
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                />
                            )}
                            style={{ flex: 1 }}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<PersonAddIcon />}
                            onClick={handleAgregarMiembro}
                            disabled={!usuarioSeleccionado}
                            style={{ marginLeft: 16 }}
                        >
                            Agregar
                        </Button>
                    </Box>

                    {cargando ? (
                        <Box display="flex" justifyContent="center" my={4}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nombre</TableCell>
                                    <TableCell>Fecha de inicio</TableCell>
                                    <TableCell>Fecha de fin</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell>Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {miembros
                                    .filter(miembro => miembro.activo) // Only show active members in the table
                                    .map((miembro) => (
                                    <TableRow key={miembro.id}>
                                        <TableCell>{miembro.persona?.nombre} {miembro.persona?.primer_apellido} {miembro.persona?.segundo_apellido || ''}</TableCell>
                                        <TableCell>{miembro.fecha_inicio ? new Date(miembro.fecha_inicio).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell>{miembro.fecha_fin ? new Date(miembro.fecha_fin).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell>
                                            {miembro.fecha_fin ? (
                                                <Typography color="error">Inactivo</Typography>
                                            ) : (
                                                <Typography color="success.main">Activo</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleAbrirEdicion(miembro)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
onClick={() => miembro.id && handleEliminarMiembro(miembro.id)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="primary">
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={edicionAbierta} onClose={handleCerrarEdicion} maxWidth="sm" fullWidth>
                <DialogTitle>Editar miembro</DialogTitle>
                <DialogContent>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                        <Box mt={2} mb={3}>
<DatePicker
                                label="Fecha de inicio"
                                value={editandoMiembro?.fecha_inicio || null}
                                onChange={(date) => {
                                    if (editandoMiembro) {
                                        setEditandoMiembro({
                                            ...editandoMiembro,
                                            fecha_inicio: date as Date || null
                                        });
                                    }
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        margin: 'normal' as const
                                    }
                                }}
                            />
                        </Box>
                        <Box mb={3}>
                            <DatePicker
                                label="Fecha de fin (opcional)"
                                value={editandoMiembro?.fecha_fin || null}
                                onChange={(date) => {
                                    if (editandoMiembro) {
                                        setEditandoMiembro({
                                            ...editandoMiembro,
                                            fecha_fin: date as Date | null,
                                            activo: !date
                                        });
                                    }
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        margin: 'normal' as const,
                                        helperText: 'Dejar en blanco si el miembro sigue activo'
                                    }
                                }}
                            />
                        </Box>
                    </LocalizationProvider>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCerrarEdicion} color="primary">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleEnviarEdicion}
                        color="primary"
                        variant="contained"
                        disabled={guardando}
                        startIcon={guardando ? <CircularProgress size={20} /> : <SaveIcon />}
                    >
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};
