import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, List, ListItem, ListItemText, TextField, Tooltip, Typography } from '@mui/material';
import { AttachFile as AttachFileIcon, Email as EmailIcon, Send as SendIcon } from '@mui/icons-material';
import type { Convocatoria, Reunion } from '../types';
import { enviarConvocatoria, getConvocatorias } from '../services/reunionesApi';

interface Props {
  reunion: Reunion | null;
  open: boolean;
  onClose: () => void;
}

const textoInicial = (reunion: Reunion) => `Se convoca a los miembros del grupo a la reunión del día {fecha}, a las {hora}, en {lugar}.

${reunion.descripcion || ''}`.trim();

export const ConvocatoriasDialog = ({ reunion, open, onClose }: Props) => {
  const [texto, setTexto] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    if (!reunion?.id) return;
    setCargando(true);
    try { setConvocatorias(await getConvocatorias(reunion.id)); }
    catch { setError('No se pudieron cargar las convocatorias anteriores.'); }
    finally { setCargando(false); }
  };

  useEffect(() => {
    if (open && reunion) {
      setTexto(textoInicial(reunion));
      setArchivos([]);
      setError('');
      cargar();
    }
  }, [open, reunion]);

  const enviar = async () => {
    if (!reunion?.id) return;
    setEnviando(true);
    setError('');
    try {
      await enviarConvocatoria(reunion.id, texto, archivos);
      setArchivos([]);
      await cargar();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo enviar la convocatoria.');
    } finally { setEnviando(false); }
  };

  const reutilizar = (convocatoria: Convocatoria) => {
    setTexto(convocatoria.texto);
    setArchivos([]);
  };

  return <Dialog open={open} onClose={() => !enviando && onClose()} fullWidth maxWidth="md">
    <DialogTitle>Convocatorias de reunión</DialogTitle>
    <DialogContent dividers>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Puedes usar {`{fecha}`}, {`{hora}`}, {`{lugar}`} y {`{grupo}`}; se sustituyen al enviar.
      </Typography>
      <TextField multiline minRows={6} fullWidth label="Texto de convocatoria" value={texto} onChange={e => setTexto(e.target.value)} required />
      <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button component="label" startIcon={<AttachFileIcon />}>Añadir adjuntos<input hidden type="file" multiple onChange={e => setArchivos(Array.from(e.target.files || []))} /></Button>
        <Typography variant="body2">{archivos.length ? archivos.map(a => a.name).join(', ') : 'Sin adjuntos nuevos'}</Typography>
      </Box>
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6">Envíos anteriores</Typography>
      {cargando ? <CircularProgress size={24} /> : convocatorias.length === 0 ? <Typography color="text.secondary">Aún no se ha enviado ninguna convocatoria.</Typography> :
        <List dense>{convocatorias.map(c => <ListItem key={c.id} secondaryAction={<Tooltip title="Reenviar convocatoria"><IconButton onClick={() => reutilizar(c)}><EmailIcon /></IconButton></Tooltip>}>
          <ListItemText primary={new Date(c.enviada_en).toLocaleString()} secondary={`${JSON.parse(c.destinatarios).length} destinatarios · ${c.archivos?.map(a => a.nombre_original).join(', ') || 'sin adjuntos'}`} />
        </ListItem>)}</List>}
    </DialogContent>
    <DialogActions><Button onClick={onClose} disabled={enviando}>Cerrar</Button><Button variant="contained" startIcon={enviando ? <CircularProgress size={18} /> : <SendIcon />} onClick={enviar} disabled={enviando || !texto.trim()}>Enviar</Button></DialogActions>
  </Dialog>;
};
