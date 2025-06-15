import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Snackbar,
    Alert,
    Tabs,
    Tab,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, People as PeopleIcon, Search as SearchIcon, Event as EventIcon, Group as GroupIcon } from '@mui/icons-material';
import { getGrupos, createGrupo, updateGrupo, deleteGrupo, getMiembros } from '../services/api';
import { MiembrosGrupo } from './MiembrosGrupo';
import { Reuniones } from './Reuniones';
import type { Grupo, Miembro } from '../types';

export const Grupos = () => {
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [grupoEditando, setGrupoEditando] = useState<Grupo | null>(null);
    const [nuevoGrupo, setNuevoGrupo] = useState<Omit<Grupo, 'id'>>({ 
        nombre: '',
        descripcion: null 
    });
    const [openDialog, setOpenDialog] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ 
        open: false, 
        message: '', 
        severity: 'success' 
    });
    const [miembrosDialogOpen, setMiembrosDialogOpen] = useState(false);
    const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);
    const [filtroBusqueda, setFiltroBusqueda] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [miembros, setMiembros] = useState<Miembro[]>([]);

    // Filtrar grupos según el término de búsqueda
    const gruposFiltrados = grupos.filter(grupo => {
        const busqueda = filtroBusqueda.toLowerCase();
        const nombre = grupo.nombre.toLowerCase();
        const descripcion = grupo.descripcion?.toLowerCase() || '';
        
        return (
            nombre.includes(busqueda) ||
            descripcion.includes(busqueda)
        );
    });

    const cargarGrupos = useCallback(async () => {
        try {
            const response = await getGrupos();
            setGrupos(response.data);
        } catch (error) {
            console.error('Error al cargar grupos:', error);
            setSnackbar({
                open: true,
                message: 'Error al cargar los grupos',
                severity: 'error'
            });
        }
    }, []);

    const cargarMiembros = useCallback(async (grupoId: number) => {
        try {
            const response = await getMiembros(grupoId, true);
            setMiembros(response.data);
        } catch (error) {
            console.error('Error al cargar miembros del grupo:', error);
            setSnackbar({
                open: true,
                message: 'Error al cargar los miembros del grupo',
                severity: 'error'
            });
        }
    }, []);

    // Cargar grupos al iniciar el componente
    useEffect(() => {
        cargarGrupos();
    }, [cargarGrupos]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    // Manejar abrir diálogo de miembros
    const handleOpenMiembrosDialog = (grupo: Grupo) => {
        if (grupo.id) {
            setGrupoSeleccionado(grupo);
            cargarMiembros(grupo.id);
            setTabValue(1); // Cambiar a la pestaña de miembros
        } else {
            console.error('El grupo no tiene un ID válido');
            setSnackbar({
                open: true,
                message: 'Error: El grupo no tiene un ID válido',
                severity: 'error'
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (grupoEditando && grupoEditando.id) {
                // When updating, use the current form values from nuevoGrupo
                await updateGrupo(grupoEditando.id, { 
                    ...nuevoGrupo,
                    // Make sure to include all required fields
                    id: grupoEditando.id 
                });
                
                // Update the grupoSeleccionado if it's the currently selected group
                if (grupoSeleccionado && grupoEditando.id === grupoSeleccionado.id) {
                    setGrupoSeleccionado({
                        ...grupoSeleccionado,
                        nombre: nuevoGrupo.nombre,
                        descripcion: nuevoGrupo.descripcion
                    });
                }
                
                mostrarMensaje('Grupo actualizado correctamente', 'success');
            } else {
                // When creating a new group
                await createGrupo(nuevoGrupo);
                mostrarMensaje('Grupo creado correctamente', 'success');
            }
            setOpenDialog(false);
            setGrupoEditando(null);
            setNuevoGrupo({ nombre: '', descripcion: null });
            // Refresh the groups list
            await cargarGrupos();
        } catch (error) {
            console.error('Error al guardar el grupo:', error);
            mostrarMensaje('Error al guardar el grupo. Por favor, inténtalo de nuevo.', 'error');
        }
    };

    const handleEditar = (grupo: Grupo) => {
        setGrupoEditando(grupo);
        setNuevoGrupo({ 
            nombre: grupo.nombre, 
            descripcion: grupo.descripcion 
        });
        setOpenDialog(true);
    };

    const handleEliminar = async (id: number | undefined) => {
        if (id === undefined) return;
        
        if (window.confirm('¿Está seguro de que desea eliminar este grupo?')) {
            try {
                await deleteGrupo(id);
                setSnackbar({ open: true, message: 'Grupo eliminado correctamente', severity: 'success' });
                cargarGrupos();
            } catch (error) {
                console.error('Error al eliminar el grupo:', error);
                setSnackbar({ 
                    open: true, 
                    message: 'Error al eliminar el grupo', 
                    severity: 'error' 
                });
            }
        }
    };

    const mostrarMensaje = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" component="h2">
                        {grupoSeleccionado ? grupoSeleccionado.nombre : 'Gestión de Grupos'}
                    </Typography>
                    {!grupoSeleccionado && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setGrupoEditando(null);
                                setNuevoGrupo({ nombre: '', descripcion: null });
                                setOpenDialog(true);
                            }}
                        >
                            Nuevo Grupo
                        </Button>
                    )}
                </Box>
                {!grupoSeleccionado && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Buscar grupos..."
                            value={filtroBusqueda}
                            onChange={(e) => setFiltroBusqueda(e.target.value)}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '28px',
                                    backgroundColor: 'background.paper',
                                },
                            }}
                        />
                    </Box>
                )}
            </Box>
            
            {!grupoSeleccionado ? (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Descripción</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {gruposFiltrados.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                        <Typography variant="body1" color="textSecondary">
                                            {filtroBusqueda ? 
                                                'No se encontraron grupos que coincidan con la búsqueda' : 
                                                'No hay grupos registrados'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                gruposFiltrados.map((grupo) => (
                                    <TableRow 
                                        key={grupo.id}
                                        hover
                                        onClick={() => {
                                            if (grupo.id) {  // Verificar que grupo.id existe
                                                setGrupoSeleccionado(grupo);
                                                cargarMiembros(grupo.id);
                                            }
                                        }}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell>{grupo.id}</TableCell>
                                        <TableCell>{grupo.nombre}</TableCell>
                                        <TableCell>{grupo.descripcion || 'Sin descripción'}</TableCell>
                                        <TableCell align="right">
                                            <IconButton 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenMiembrosDialog(grupo);
                                                }}
                                            >
                                                <PeopleIcon />
                                            </IconButton>
                                            <IconButton 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditar(grupo);
                                                }}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (grupo.id) handleEliminar(grupo.id);
                                                }} 
                                                color="error"
                                                disabled={!grupo.id}
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
            ) : (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Button
                            startIcon={<GroupIcon />}
                            onClick={() => setGrupoSeleccionado(null)}
                            sx={{ mb: 2 }}
                        >
                            Volver a la lista de grupos
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setGrupoEditando(grupoSeleccionado);
                                setNuevoGrupo({ 
                                    nombre: grupoSeleccionado.nombre, 
                                    descripcion: grupoSeleccionado.descripcion 
                                });
                                setOpenDialog(true);
                            }}
                            sx={{ mb: 2 }}
                        >
                            Editar Grupo
                        </Button>
                    </Box>
                    
                    <Paper sx={{ width: '100%', mb: 2 }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            indicatorColor="primary"
                            textColor="primary"
                            variant="fullWidth"
                        >
                            <Tab icon={<EventIcon />} label="Reuniones" />
                            <Tab icon={<PeopleIcon />} label="Miembros" />
                        </Tabs>
                    </Paper>

                    {tabValue === 0 ? (
                        <Reuniones 
                            grupoId={grupoSeleccionado?.id ?? 0} 
                            miembros={miembros}
                            grupoNombre={grupoSeleccionado?.nombre ?? ''}
                        />
                    ) : (
                        <MiembrosGrupo
                            open={true}
                            onClose={() => setTabValue(0)}
                            grupoId={grupoSeleccionado?.id ?? 0}
                            grupoNombre={grupoSeleccionado?.nombre ?? ''}
                            onMiembroAgregado={() => {
                                // Refresh the members list when a member is added or removed
                                if (grupoSeleccionado?.id) {
                                    cargarMiembros(grupoSeleccionado.id);
                                }
                            }}
                        />
                    )}
                </Box>
            )}

            {/* Diálogo para crear/editar grupo */}
            <Dialog 
                open={openDialog} 
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <form onSubmit={handleSubmit}>
                    <DialogTitle>
                        {grupoEditando ? 'Editar Grupo' : 'Nuevo Grupo'}
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                fullWidth
                                label="Nombre"
                                value={nuevoGrupo.nombre}
                                onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombre: e.target.value })}
                                margin="normal"
                                required
                            />
                            <TextField
                                fullWidth
                                label="Descripción"
                                value={nuevoGrupo.descripcion || ''}
                                onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, descripcion: e.target.value || null })}
                                margin="normal"
                                multiline
                                rows={3}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button 
                            onClick={() => setOpenDialog(false)}
                            color="inherit"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            color="primary"
                            disabled={!nuevoGrupo.nombre}
                        >
                            {grupoEditando ? 'Guardar Cambios' : 'Crear'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Notificación */}
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
            
            {grupoSeleccionado && (
                <MiembrosGrupo
                    open={miembrosDialogOpen}
                    onClose={() => {
                        setMiembrosDialogOpen(false);
                        setGrupoSeleccionado(null);
                    }}
                    grupoId={grupoSeleccionado.id!}
                    grupoNombre={grupoSeleccionado.nombre}
                />
            )}
        </Box>
    );
};
