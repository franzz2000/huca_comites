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
    Paper
} from '@mui/material';
import { Delete as DeleteIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { getUsuarios, getMiembros, createMiembro, deleteMiembro, getUsuario } from '../services/api';
import type { Usuario, Miembro } from '../types';

interface MiembrosGrupoProps {
    open: boolean;
    onClose: () => void;
    grupoId: number | null;
    grupoNombre: string;
    onMiembroAgregado?: () => void;
}


export const MiembrosGrupo = ({ open, onClose, grupoId, grupoNombre, onMiembroAgregado }: MiembrosGrupoProps) => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [miembros, setMiembros] = useState<Miembro[]>([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
    const [cargando, setCargando] = useState(false);
    
    // Formatear el nombre completo de un usuario
    const getNombreCompleto = (usuario: Usuario) => {
        return `${usuario.nombre || ''} ${usuario.primer_apellido || ''}${usuario.segundo_apellido ? ' ' + usuario.segundo_apellido : ''}`.trim();
    };

    const cargarUsuarios = useCallback(async () => {
        try {
            const { data } = await getUsuarios();
            setUsuarios(data);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            setSnackbar({
                open: true,
                message: 'Error al cargar la lista de usuarios',
                severity: 'error'
            });
        }
    }, []);

    const cargarMiembros = useCallback(async () => {
        if (!grupoId) {
            setMiembros([]);
            return;
        }
        
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
            console.error('Error al cargar miembros:', error);
            setSnackbar({
                open: true,
                message: 'Error al cargar los miembros del grupo',
                severity: 'error'
            });
        }
    }, [grupoId]);

    const cargarDatos = useCallback(async () => {
        try {
            setCargando(true);
            await Promise.all([cargarUsuarios(), cargarMiembros()]);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setCargando(false);
        }
    }, [cargarUsuarios, cargarMiembros]);

    const [snackbar, setSnackbar] = useState<{ 
        open: boolean; 
        message: string; 
        severity: 'success' | 'error' | 'info' | 'warning' 
    }>({ 
        open: false, 
        message: '', 
        severity: 'info' 
    });

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
            console.error('Error al agregar miembro:', error);
            setSnackbar({
                open: true,
                message: 'Error al agregar el miembro',
                severity: 'error'
            });
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
            console.error('Error al eliminar miembro:', error);
            setSnackbar({
                open: true,
                message: 'Error al eliminar el miembro',
                severity: 'error'
            });
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

                            <Paper variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Nombre completo</TableCell>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Puesto</TableCell>
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
                                                <TableCell align="right">
                                                    <IconButton
                                                        onClick={() => miembro.id && handleEliminarMiembro(miembro.id)}
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
                                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="textSecondary">
                                                        No hay miembros en este grupo
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>
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
        </>
    );
};
