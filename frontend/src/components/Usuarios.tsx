import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Snackbar,
    Alert,
    InputAdornment,
    Chip,
    CircularProgress,
    LinearProgress
} from '@mui/material';
import { 
    Add as AddIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    Search as SearchIcon,
    Group as GroupIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getMiembros, getGrupos, updateMiembro, getEstadisticasAsistencia } from '../services/api'; 
import type { Usuario, Miembro, Grupo } from '../types';

interface GrupoUsuario extends Omit<Miembro, 'fecha_inicio' | 'fecha_fin'> {
    grupo_nombre: string;
    fecha_inicio: string;  
    fecha_fin: string | null;
    activo: boolean;
    estadisticas?: EstadisticasAsistencia;
    cargandoEstadisticas?: boolean;
}

interface EstadisticasAsistencia {
    totalReuniones: number;
    asistencias: number;
    excusas: number;
    inasistencias: number;
}

export const Usuarios = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
    const [nuevoUsuario, setNuevoUsuario] = useState<Omit<Usuario, 'id'>>({ 
        nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        email: '',
        telefono: '',
        puesto_trabajo: '',
        observaciones: ''
    });
    const [gruposUsuario, setGruposUsuario] = useState<GrupoUsuario[]>([]);
    const [cargandoGrupos, setCargandoGrupos] = useState(false);
    const [editandoMiembroId, setEditandoMiembroId] = useState<number | null>(null);
    const [fechasEditadas, setFechasEditadas] = useState<{fecha_inicio: string; fecha_fin: string | null}>({fecha_inicio: '', fecha_fin: null});
    const [filtroBusqueda, setFiltroBusqueda] = useState('');
    const [snackbar, setSnackbar] = useState<{ 
        open: boolean; 
        message: string; 
        severity: 'success' | 'error' | 'info' | 'warning' 
    }>({ 
        open: false, 
        message: '', 
        severity: 'info' 
    });

    const usuariosFiltrados = usuarios.filter(usuario => {
        const busqueda = filtroBusqueda.toLowerCase();
        const nombreCompleto = `${usuario.nombre || ''} ${usuario.primer_apellido || ''} ${usuario.segundo_apellido || ''}`.toLowerCase();
        const email = usuario.email?.toLowerCase() || '';
        const telefono = usuario.telefono?.toLowerCase() || '';
        const puesto = usuario.puesto_trabajo?.toLowerCase() || '';
        
        return (
            nombreCompleto.includes(busqueda) ||
            email.includes(busqueda) ||
            telefono.includes(busqueda) ||
            puesto.includes(busqueda) ||
            (usuario.observaciones?.toLowerCase().includes(busqueda) || false)
        );
    });

    const cargarUsuarios = useCallback(async () => {
        try {
            const response = await getUsuarios();
            setUsuarios(response.data);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            mostrarMensaje('Error al cargar los usuarios', 'error');
        }
    }, []);

    useEffect(() => {
        cargarUsuarios();
    }, [cargarUsuarios]);

    const mostrarMensaje = (mensaje: string, severidad: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message: mensaje,
            severity: severidad
        });
    };

    const cargarGruposUsuario = useCallback(async (usuarioId: number) => {
        if (!usuarioId) return;
        
        try {
            setCargandoGrupos(true);
            const gruposResponse = await getGrupos();
            const gruposData: Grupo[] = gruposResponse.data;
            
            const response = await getMiembros(undefined, undefined);
            const miembros = response.data.filter((m: Miembro) => m.persona_id === usuarioId);
            
            const grupos: GrupoUsuario[] = miembros
                .filter((m): m is Miembro & { fecha_inicio: string } => !!m.fecha_inicio)
                .map((m) => {
                    const grupo = m.grupo_id ? gruposData.find(g => g.id === m.grupo_id) : undefined;
                    return {
                        ...m,
                        grupo_nombre: grupo?.nombre || `Grupo ID: ${m.grupo_id}`,
                        fecha_inicio: m.fecha_inicio,
                        fecha_fin: m.fecha_fin || null,
                        activo: !m.fecha_fin
                    };
                });
            
            setGruposUsuario(grupos);
        } catch (error) {
            console.error('Error al cargar los grupos del usuario:', error);
            mostrarMensaje('Error al cargar los grupos del usuario', 'error');
        } finally {
            setCargandoGrupos(false);
        }
    }, []);

    const handleOpenDialog = async (usuario: Usuario | null = null) => {
        if (usuario) {
            setUsuarioEditando(usuario);
            setNuevoUsuario({
                nombre: usuario.nombre,
                primer_apellido: usuario.primer_apellido,
                segundo_apellido: usuario.segundo_apellido || '',
                email: usuario.email,
                telefono: usuario.telefono || '',
                puesto_trabajo: usuario.puesto_trabajo || '',
                observaciones: usuario.observaciones || ''
            });
            if (usuario.id) {
                await cargarGruposUsuario(usuario.id);
            }
        } else {
            setUsuarioEditando(null);
            setNuevoUsuario({
                nombre: '',
                primer_apellido: '',
                segundo_apellido: '',
                email: '',
                telefono: '',
                puesto_trabajo: '',
                observaciones: ''
            });
            setGruposUsuario([]);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setUsuarioEditando(null);
        setEditandoMiembroId(null);
        setFechasEditadas({fecha_inicio: '', fecha_fin: null});
        setNuevoUsuario({
            nombre: '',
            primer_apellido: '',
            segundo_apellido: '',
            email: '',
            telefono: '',
            puesto_trabajo: '',
            observaciones: ''
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNuevoUsuario(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!nuevoUsuario.nombre || !nuevoUsuario.primer_apellido || !nuevoUsuario.email) {
            setSnackbar({ 
                open: true, 
                message: 'Por favor complete los campos requeridos (Nombre, Primer Apellido y Email)', 
                severity: 'error' 
            });
            return;
        }

        try {
            if (usuarioEditando?.id) {
                await updateUsuario(usuarioEditando.id, {
                    nombre: nuevoUsuario.nombre,
                    primer_apellido: nuevoUsuario.primer_apellido,
                    segundo_apellido: nuevoUsuario.segundo_apellido || null,
                    email: nuevoUsuario.email,
                    telefono: nuevoUsuario.telefono || null,
                    puesto_trabajo: nuevoUsuario.puesto_trabajo || null,
                    observaciones: nuevoUsuario.observaciones || null
                });
                setSnackbar({ open: true, message: 'Usuario actualizado correctamente', severity: 'success' });
            } else {
                await createUsuario({
                    nombre: nuevoUsuario.nombre,
                    primer_apellido: nuevoUsuario.primer_apellido,
                    segundo_apellido: nuevoUsuario.segundo_apellido || null,
                    email: nuevoUsuario.email,
                    telefono: nuevoUsuario.telefono || null,
                    puesto_trabajo: nuevoUsuario.puesto_trabajo || null,
                    observaciones: nuevoUsuario.observaciones || null
                });
                setSnackbar({ open: true, message: 'Usuario creado correctamente', severity: 'success' });
            }
            setOpenDialog(false);
            await cargarUsuarios();
        } catch (error) {
            console.error('Error al guardar el usuario:', error);
            setSnackbar({ 
                open: true, 
                message: `Error al ${usuarioEditando ? 'actualizar' : 'crear'} el usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`, 
                severity: 'error' 
            });
        }
    };

    const handleEliminar = async (id: number) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
            return;
        }
        
        try {
            await deleteUsuario(id);
            mostrarMensaje('Usuario eliminado correctamente', 'success');
            await cargarUsuarios();
        } catch (error) {
            console.error('Error al eliminar el usuario:', error);
            mostrarMensaje('Error al eliminar el usuario', 'error');
        }
    };

    const handleEditarMiembro = (miembro: GrupoUsuario) => {
        setEditandoMiembroId(miembro.id!);
        setFechasEditadas({
            fecha_inicio: miembro.fecha_inicio,
            fecha_fin: miembro.fecha_fin
        });
    };

    const handleCancelarEdicion = () => {
        setEditandoMiembroId(null);
        setFechasEditadas({fecha_inicio: '', fecha_fin: null});
    };

    const handleGuardarMiembro = async (miembro: GrupoUsuario) => {
        try {
            if (!miembro.id) return;
            
            await updateMiembro(miembro.id, {
                fecha_inicio: fechasEditadas.fecha_inicio,
                fecha_fin: fechasEditadas.fecha_fin || null
            });
            
            if (usuarioEditando?.id) {
                await cargarGruposUsuario(usuarioEditando.id);
            }
            
            setEditandoMiembroId(null);
            mostrarMensaje('Fechas de membresía actualizadas correctamente', 'success');
        } catch (error) {
            console.error('Error al actualizar la membresía:', error);
            mostrarMensaje('Error al actualizar las fechas de membresía', 'error');
        }
    };

    const handleFechaChange = (campo: 'fecha_inicio' | 'fecha_fin', valor: string) => {
        setFechasEditadas(prev => ({
            ...prev,
            [campo]: valor || null
        }));
    };

    const cargarEstadisticasGrupo = useCallback(async (usuarioId: number, grupo: GrupoUsuario) => {
        try {
            setGruposUsuario(prev => prev.map(g => 
                g.grupo_id === grupo.grupo_id ? { ...g, cargandoEstadisticas: true } : g
            ));
            
            const estadisticas = await getEstadisticasAsistencia(usuarioId, grupo.grupo_id);
            
            setGruposUsuario(prev => prev.map(g => 
                g.grupo_id === grupo.grupo_id 
                    ? { 
                        ...g, 
                        estadisticas,
                        cargandoEstadisticas: false 
                      } 
                    : g
            ));
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            setGruposUsuario(prev => prev.map(g => 
                g.grupo_id === grupo.grupo_id ? { ...g, cargandoEstadisticas: false } : g
            ));
        }
    }, []);

    useEffect(() => {
        if (usuarioEditando && gruposUsuario.length > 0) {
            gruposUsuario.forEach(grupo => {
                if (usuarioEditando.id && grupo.activo && !grupo.estadisticas && !grupo.cargandoEstadisticas) {
                    cargarEstadisticasGrupo(usuarioEditando.id, grupo);
                }
            });
        }
    }, [usuarioEditando, gruposUsuario, cargarEstadisticasGrupo]);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" component="h2">
                        Gestión de Usuarios
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Nuevo Usuario
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Buscar usuarios..."
                        value={filtroBusqueda}
                        onChange={(e) => setFiltroBusqueda(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', mr: 1 }} /></InputAdornment>,
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '28px',
                                backgroundColor: 'background.paper',
                            },
                        }}
                    />
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Nombre Completo</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Teléfono</TableCell>
                            <TableCell>Puesto</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {usuariosFiltrados.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <Typography variant="body1" color="textSecondary">
                                        {filtroBusqueda ? 
                                            'No se encontraron usuarios que coincidan con la búsqueda' : 
                                            'No hay usuarios registrados'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            usuariosFiltrados.map((usuario) => (
                                <TableRow key={usuario.id}>
                                    <TableCell>{usuario.id}</TableCell>
                                    <TableCell>
                                        {usuario.nombre} {usuario.primer_apellido} {usuario.segundo_apellido || ''}
                                    </TableCell>
                                    <TableCell>{usuario.email}</TableCell>
                                    <TableCell>{usuario.telefono || '-'}</TableCell>
                                    <TableCell>{usuario.puesto_trabajo || '-'}</TableCell>
                                    <TableCell align="right">
                                        <IconButton onClick={() => handleOpenDialog(usuario)} color="primary">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton 
                                            onClick={() => handleEliminar(usuario.id!)} 
                                            color="error"
                                            disabled={!usuario.id || usuario.id === 1}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog 
                open={openDialog} 
                onClose={handleCloseDialog} 
                maxWidth="md" 
                fullWidth
                scroll="paper"
            >
                <form onSubmit={handleSubmit}>
                    <DialogTitle>
                        {usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ mt: 2, display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                            <TextField
                                fullWidth
                                label="Nombre"
                                name="nombre"
                                value={nuevoUsuario.nombre}
                                onChange={handleInputChange}
                                margin="normal"
                                required
                            />
                            <TextField
                                fullWidth
                                label="Primer Apellido"
                                name="primer_apellido"
                                value={nuevoUsuario.primer_apellido}
                                onChange={handleInputChange}
                                margin="normal"
                                required
                            />
                            <TextField
                                fullWidth
                                label="Segundo Apellido"
                                name="segundo_apellido"
                                value={nuevoUsuario.segundo_apellido || ''}
                                onChange={handleInputChange}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={nuevoUsuario.email}
                                onChange={handleInputChange}
                                margin="normal"
                                required
                            />
                            <TextField
                                fullWidth
                                label="Teléfono"
                                name="telefono"
                                value={nuevoUsuario.telefono || ''}
                                onChange={handleInputChange}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Puesto de Trabajo"
                                name="puesto_trabajo"
                                value={nuevoUsuario.puesto_trabajo || ''}
                                onChange={handleInputChange}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Observaciones"
                                name="observaciones"
                                value={nuevoUsuario.observaciones || ''}
                                onChange={handleInputChange}
                                margin="normal"
                                multiline
                                rows={2}
                                sx={{ gridColumn: '1 / -1' }}
                            />
                        </Box>

                        {usuarioEditando && (
                            <Box mt={4}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <GroupIcon color="primary" sx={{ mr: 1 }} />
                                    <Typography variant="h6">Grupos del Usuario</Typography>
                                </Box>
                                
                                {cargandoGrupos ? (
                                    <Box display="flex" justifyContent="center" p={3}>
                                        <CircularProgress />
                                    </Box>
                                ) : gruposUsuario.length === 0 ? (
                                    <Alert severity="info">El usuario no pertenece a ningún grupo.</Alert>
                                ) : (
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Grupo</TableCell>
                                                    <TableCell>Estado</TableCell>
                                                    <TableCell>Asistencia</TableCell>
                                                    <TableCell>Acciones</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {gruposUsuario.map((grupo) => (
                                                    <TableRow key={grupo.grupo_id}>
                                                        <TableCell>{grupo.grupo_nombre}</TableCell>
                                                        <TableCell>
                                                            {grupo.activo ? (
                                                                <Chip label="Activo" color="success" size="small" />
                                                            ) : (
                                                                <Chip label="Inactivo" size="small" />
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {grupo.cargandoEstadisticas ? (
                                                                <CircularProgress size={20} />
                                                            ) : grupo.estadisticas ? (
                                                                <Box sx={{ minWidth: 200 }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                        <Box sx={{ width: 60, textAlign: 'right' }}>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                {Math.round((grupo.estadisticas.asistencias / (grupo.estadisticas.totalReuniones || 1)) * 100)}%
                                                                            </Typography>
                                                                        </Box>
                                                                        <Box sx={{ flexGrow: 1 }}>
                                                                            <LinearProgress 
                                                                                variant="determinate"
                                                                                value={(grupo.estadisticas.asistencias / (grupo.estadisticas.totalReuniones || 1)) * 100}
                                                                                color="success"
                                                                                sx={{ height: 8, borderRadius: 1 }}
                                                                            />
                                                                        </Box>
                                                                    </Box>
                                                                    <Box sx={{ display: 'flex', gap: 1, fontSize: '0.75rem' }}>
                                                                        <Chip 
                                                                            size="small" 
                                                                            label={`✓ ${grupo.estadisticas.asistencias}`} 
                                                                            color="success" 
                                                                            variant="outlined"
                                                                        />
                                                                        <Chip 
                                                                            size="small" 
                                                                            label={`! ${grupo.estadisticas.excusas}`} 
                                                                            color="warning" 
                                                                            variant="outlined"
                                                                        />
                                                                        <Chip 
                                                                            size="small" 
                                                                            label={`✕ ${grupo.estadisticas.inasistencias}`} 
                                                                            color="error" 
                                                                            variant="outlined"
                                                                        />
                                                                    </Box>
                                                                </Box>
                                                            ) : (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Sin datos de asistencia
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    const updatedGrupos = gruposUsuario.map(g => 
                                                                        g.grupo_id === grupo.grupo_id ? { ...g, activo: !g.activo } : g
                                                                    );
                                                                    setGruposUsuario(updatedGrupos);
                                                                }}
                                                            >
                                                                {grupo.activo ? <CancelIcon color="error" /> : <CheckCircleIcon color="success" />}
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleCloseDialog} variant="outlined">
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            color="primary"
                            disabled={cargandoGrupos}
                        >
                            {usuarioEditando ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert 
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};
