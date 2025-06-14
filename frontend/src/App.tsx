import { useState } from 'react';
import { ThemeProvider, CssBaseline, Container, AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { Grupos } from './components/Grupos';
import { Usuarios } from './components/Usuarios';
import './App.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

type ViewType = 'grupos' | 'usuarios';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('grupos');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Gestión de Comités
            </Typography>
            <Button 
              color="inherit" 
              onClick={() => setCurrentView('grupos')}
              variant={currentView === 'grupos' ? 'outlined' : 'text'}
              sx={{ mr: 1 }}
            >
              Grupos
            </Button>
            <Button 
              color="inherit" 
              onClick={() => setCurrentView('usuarios')}
              variant={currentView === 'usuarios' ? 'outlined' : 'text'}
            >
              Usuarios
            </Button>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
          {currentView === 'grupos' ? <Grupos /> : <Usuarios />}
        </Container>
        
        <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: (theme) => 
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800]
        }}>
          <Container maxWidth="lg">
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} Gestión de Comités - Todos los derechos reservados
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
