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
import { getUsuarios, getMiembros, createMiembro, updateMiembro, deleteMiembro, getUsuario } from '../services/api';
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
        return `${usuario.nombre || ''} ${usuario.apellido1 || ''} ${usuario.apellido2 || ''}`.trim();
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleError = (error: unknown, defaultMessage = 'Ha ocurrido un error') => {
        console.error(error);
        const message = error instanceof Error ? error.message : defaultMessage;
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
            const { data } = await getMiembros(grupoId);
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
        if (!usuarioSeleccionado || !grupoId) return;

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
            await updateMiembro(editandoMiembro.id, {
                fecha_inicio: editandoMiembro.fecha_inicio?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                fecha_fin: editandoMiembro.fecha_fin?.toISOString().split('T')[0] || null
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
        if (!window.confirm('¿Está seguro de eliminar este miembro del grupo?')) return;
        
        try {
            await deleteMiembro(miembroId);
            await cargarMiembros();
            
            if (onMiembroAgregado) {
                onMiembroAgregado();
            }
            
            setSnackbar({
                open: true,
                message: 'Miembro eliminado correctamente',
                severity: 'success'
            });
        } catch (error) {
            handleError(error, 'Error al eliminar el miembro');
        }
    };
    // State for component data
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
        return `${usuario.nombre || ''} ${usuario.apellidos || ''}`.trim();
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleError = (error: unknown, defaultMessage = 'Ha ocurrido un error') => {
        console.error(error);
        const message = error instanceof Error ? error.message : defaultMessage;
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
            const { data } = await getMiembros(grupoId);
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
        if (!usuarioSeleccionado || !grupoId) return;

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
            await updateMiembro(editandoMiembro.id, {
                fecha_inicio: editandoMiembro.fecha_inicio?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                fecha_fin: editandoMiembro.fecha_fin?.toISOString().split('T')[0] || null
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
        if (!window.confirm('¿Está seguro de eliminar este miembro del grupo?')) return;
        
        try {
            await deleteMiembro(miembroId);
            await cargarMiembros();
            
            if (onMiembroAgregado) {
                onMiembroAgregado();
            }
            
            setSnackbar({
                open: true,
                message: 'Miembro eliminado correctamente',
                severity: 'success'
            });
        } catch (error) {
            handleError(error, 'Error al eliminar el miembro');
        }
    };
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [miembros, setMiembros] = useState<Miembro[]>([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
    const [cargando, setCargando] = useState(false);
    const [edicionAbierta, setEdicionAbierta] = useState(false);
    const [editandoMiembro, setEditandoMiembro] = useState<MiembroEdicion | null>(null);
    const [guardando, setGuardando] = useState(false);
    
    const handleCerrarEdicion = () => {
        setEdicionAbierta(false);
        setEditandoMiembro(null);
    };
    
    const handleEnviarEdicion = async () => {
        if (!editandoMiembro) return;
        
        try {
            setGuardando(true);
            await updateMiembro(editandoMiembro.id, {
                fecha_inicio: editandoMiembro.fecha_inicio?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                fecha_fin: editandoMiembro.fecha_fin?.toISOString().split('T')[0] || null
            });
            
            setSnackbar({
                open: true,
    const [snackbar, setSnackbar] = useState<{ 
        open: boolean; 
        message: string; 
        severity: 'success' | 'error' | 'info' | 'warning' 
    }>({ 
        open: false, 
        message: '', 
        severity: 'info' 
    });

    const getNombreCompleto = (usuario: Usuario) => {
        return `${usuario.nombre || ''} ${usuario.primer_apellido || ''}${usuario.segundo_apellido ? ' ' + usuario.segundo_apellido : ''}`.trim();
    };

    const cargarUsuarios = useCallback(async () => {
        try {
            const { data } = await getUsuarios();
            setUsuarios(data);
        } catch (error) {
            handleError(error, setSnackbar);
        }
    }, []);

    const cargarMiembros = useCallback(async () => {
        if (!grupoId) {
            setMiembros([]);
            return;
        }
        
        setCargando(true);
        try {
            const { data } = await getMiembros(grupoId);
            // Asegurarse de que cada miembro tenga la información de persona completa
            const miembrosActualizados = await Promise.all(
                data.map(async (miembro: Miembro) => {
                    if (miembro.persona) {
                        // Si ya tiene datos de persona, asegurarse de que estén completos
                        return {
                            ...miembro,
                            persona: {
                                id: miembro.persona.id,
                                nombre: miembro.persona.nombre || '',
                                primer_apellido: miembro.persona.primer_apellido || '',
                                segundo_apellido: miembro.persona.segundo_apellido || null,
                                email: miembro.persona.email || '',
                                telefono: miembro.persona.telefono || null,
                                puesto_trabajo: miembro.persona.puesto_trabajo || null,
                                observaciones: miembro.persona.observaciones || null
                            }
                        };
                    } else if (miembro.persona_id) {
                        // Si no tiene datos de persona pero tiene un ID, cargarlos
                        try {
                            const { data: persona } = await getUsuario(miembro.persona_id);
                            return {
                                ...miembro,
                                persona: {
                                    id: persona.id,
                                    nombre: persona.nombre || '',
                                    primer_apellido: persona.primer_apellido || '',
                                    segundo_apellido: persona.segundo_apellido || null,
                                    email: persona.email || '',
                                    telefono: persona.telefono || null,
                                    puesto_trabajo: persona.puesto_trabajo || null,
                                    observaciones: persona.observaciones || null
                                }
                            };
                        } catch (error) {
                            console.error('Error al cargar datos de la persona:', error);
                            // Si hay un error, devolver un objeto de persona con los campos mínimos requeridos
                            return {
                                ...miembro,
                                persona: {
                                    id: miembro.persona_id,
                                    nombre: 'Usuario desconocido',
                                    primer_apellido: '',
                                    email: ''
                                }
                            };
                        }
                    }
                    // Si no hay información de persona, devolver un objeto por defecto
                    return {
                        ...miembro,
                        persona: {
                            id: -1,
                            nombre: 'Usuario desconocido',
                            primer_apellido: '',
                            email: ''
                        }
                    };
                })
            );
            
            setMiembros(miembrosActualizados);
        } catch (error) {
            handleError(error, setSnackbar);
        } finally {
            setCargando(false);
        }
    }, [grupoId]);

    const cargarDatos = useCallback(async () => {
        try {
            await cargarUsuarios();
            if (grupoId) {
                await cargarMiembros();
            }
        } catch (error) {
            handleError(error, setSnackbar);
        }
    }, [cargarUsuarios, cargarMiembros, grupoId]);

    useEffect(() => {
        if (open) {
            cargarDatos();
        }
    }, [open, cargarDatos]);

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleAgregarMiembro = async () => {
        if (!usuarioSeleccionado || grupoId === null) {
            setSnackbar({
                open: true,
                message: 'No se ha seleccionado un grupo válido',
                severity: 'error'
            });
            return;
        }
        
        try {
            // Create a new member with the required persona object
            await createMiembro({
                grupo_id: grupoId,
                persona_id: usuarioSeleccionado.id!,
                persona: usuarioSeleccionado, // Include the full usuario object
                fecha_inicio: new Date().toISOString().split('T')[0],
                fecha_fin: null
            });
            await cargarMiembros();
            setUsuarioSeleccionado(null);
            // Notify parent component that a member was added
            if (onMiembroAgregado) {
                onMiembroAgregado();
            }
            setSnackbar({
                open: true,
                message: 'Miembro agregado correctamente',
                severity: 'success'
            });
        } catch (error) {
            handleError(error, setSnackbar);
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

    const handleEnviarEdicion = async () => {
        if (!editandoMiembro) return;
        
        try {
            setGuardando(true);
            await updateMiembro(editandoMiembro.id, {
                fecha_inicio: editandoMiembro.fecha_inicio?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                fecha_fin: editandoMiembro.fecha_fin?.toISOString().split('T')[0] || null
            });
            
            setSnackbar({
                open: true,
                message: 'Miembro actualizado correctamente',
                severity: 'success'
            });
            
            await cargarMiembros();
            setEdicionAbierta(false);
            setEditandoMiembro(null);
        } catch (error) {
            handleError(error, setSnackbar);
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminarMiembro = async (miembroId: number) => {
        try {
            await deleteMiembro(miembroId);
            await cargarMiembros();
            // Notify parent component that a member was removed
            if (onMiembroAgregado) {
                onMiembroAgregado();
            }
            setSnackbar({
                open: true,
                message: 'Miembro eliminado correctamente',
                severity: 'success'
            });
        } catch (error) {
            handleError(error, setSnackbar);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>Miembros del grupo: {grupoNombre}</DialogTitle>
                <DialogContent>
                    {cargando ? (
                        <Box display="flex" justifyContent="center" p={3}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Box display="flex" gap={2} mb={3}>
                                <Autocomplete
                                    options={usuarios.filter(u => !miembros.some(m => m.persona_id === u.id))}
                                    getOptionLabel={(option: Usuario) => 
                                        `${getNombreCompleto(option)} (${option.email || 'sin email'})`
                                    }
                                    style={{ flex: 1 }}
                                    value={usuarioSeleccionado}
                                    onChange={(_, value) => setUsuarioSeleccionado(value)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Buscar usuario para agregar"
                                            variant="outlined"
                                            fullWidth
                                            placeholder="Escriba para buscar..."
                                        />
                                    )}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleAgregarMiembro}
                                    disabled={!usuarioSeleccionado}
                                    startIcon={<PersonAddIcon />}
                                >
                                    Agregar
                                </Button>
                            </Box>

                            <Box component="div" sx={{ p: 2, mb: 2, boxShadow: 3, borderRadius: 1 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Nombre completo</TableCell>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Puesto</TableCell>
                                            <TableCell>Inicio</TableCell>
                                            <TableCell>Fin</TableCell>
                                            <TableCell align="right">Acciones</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {miembros.map((miembro) => (
                                            <TableRow key={miembro.id} hover>
                                                <TableCell>
                                                    {miembro.persona ? 
                                                        (getNombreCompleto(miembro.persona) || 'Usuario desconocido') : 
                                                        'Usuario desconocido'}
                                                </TableCell>
                                                <TableCell>{miembro.persona?.email || '-'}</TableCell>
                                                <TableCell>{miembro.persona?.puesto_trabajo || '-'}</TableCell>
                                                <TableCell>
                                                    {miembro.fecha_inicio ? new Date(miembro.fecha_inicio).toLocaleDateString() : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {miembro.fecha_fin ? new Date(miembro.fecha_fin).toLocaleDateString() : 'Activo'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAbrirEdicion(miembro);
                                                        }}
                                                        color="primary"
                                                        size="small"
                                                        aria-label="Editar fechas"
                                                        sx={{ mr: 1 }}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            miembro.id && handleEliminarMiembro(miembro.id);
                                                        }}
                                                        color="error"
                                                        size="small"
                                                        aria-label="Eliminar miembro"
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {miembros.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="textSecondary">
                                                        No hay miembros en este grupo
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="primary">
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
            
            {/* Diálogo de edición de fechas */}
            <Dialog open={edicionAbierta} onClose={handleCerrarEdicion} maxWidth="sm" fullWidth>
                <DialogTitle>Editar fechas de membresía</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, mb: 2 }}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                            <Box sx={{ mb: 2 }}>
                                <DatePicker
                                    label="Fecha de inicio"
                                    value={editandoMiembro?.fecha_inicio || new Date()}
                                    onChange={(fecha) => {
                                        if (editandoMiembro) {
                                            setEditandoMiembro({ 
                                                ...editandoMiembro, 
                                                fecha_inicio: fecha 
                                            });
                                        }
                                    }}
                                    slotProps={{ 
                                        textField: { 
                                            fullWidth: true 
                                        } 
                                    }}
                                />
                            </Box>
                            <Box>
                                <DatePicker
                                    label="Fecha de fin (opcional)"
                                    value={editandoMiembro?.fecha_fin || null}
                                    onChange={(fecha) => {
                                        if (editandoMiembro) {
                                            setEditandoMiembro({ 
                                                ...editandoMiembro, 
                                                fecha_fin: fecha 
                                            });
                                        }
                                    }}
                                    slotProps={{ 
                                        textField: { 
                                            fullWidth: true 
                                        } 
                                    }}
                                    minDate={editandoMiembro?.fecha_inicio || undefined}
                                />
                            </Box>
                        </LocalizationProvider>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCerrarEdicion} startIcon={<CloseIcon />}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleEnviarEdicion} 
                        variant="contained" 
                        color="primary" 
                        startIcon={guardando ? <CircularProgress size={20} /> : <SaveIcon />}
                        disabled={guardando}
                    >
                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </DialogActions>
            </Dialog>


                <Dialog open={edicionAbierta} onClose={handleCerrarEdicion} maxWidth="sm" fullWidth>
                    <DialogTitle>Editar fechas de membresía</DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2, mb: 2 }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                                <Box sx={{ mb: 2 }}>
                                    <DatePicker
                                        label="Fecha de inicio"
                                        value={editandoMiembro?.fecha_inicio || new Date()}
                                        onChange={(fecha) => {
                                            if (editandoMiembro) {
                                                setEditandoMiembro({ 
                                                    ...editandoMiembro, 
                                                    fecha_inicio: fecha 
                                                });
                                            }
                                        }}
                                        slotProps={{ 
                                            textField: { 
                                                fullWidth: true 
                                            } 
                                        }}
                                    />
                                </Box>
                                <Box>
                                    <DatePicker
                                        label="Fecha de fin (opcional)"
                                        value={editandoMiembro?.fecha_fin || null}
                                        onChange={(fecha) => {
                                            if (editandoMiembro) {
                                                setEditandoMiembro({ 
                                                    ...editandoMiembro, 
                                                    fecha_fin: fecha 
                                                });
                                            }
                                        }}
                                        slotProps={{ 
                                            textField: { 
                                                fullWidth: true 
                                            } 
                                        }}
                                        minDate={editandoMiembro?.fecha_inicio || undefined}
                                    />
                                </Box>
                            </LocalizationProvider>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCerrarEdicion} startIcon={<CloseIcon />}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleEnviarEdicion} 
                            variant="contained" 
                            color="primary" 
                            startIcon={guardando ? <CircularProgress size={20} /> : <SaveIcon />}
                            disabled={guardando}
                        >
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
};
