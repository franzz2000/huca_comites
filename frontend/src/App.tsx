import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Button, Box, Container, IconButton } from '@mui/material';
import { useCallback } from 'react';
import { createTheme } from '@mui/material/styles';
import { AuthProvider, useAuth } from './contexts';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { Grupos } from './components/Grupos';
import { Usuarios } from './components/Usuarios';
import LogoutIcon from '@mui/icons-material/Logout';
import './App.css';

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

const AppLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Gestión de Comités
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => navigate('/')}
            variant={location.pathname === '/' ? 'outlined' : 'text'}
            sx={{ mr: 1 }}
          >
            Grupos
          </Button>
          <Button 
            color="inherit" 
            onClick={() => navigate('/usuarios')}
            variant={location.pathname === '/usuarios' ? 'outlined' : 'text'}
            sx={{ mr: 2 }}
          >
            Usuarios
          </Button>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            {user.nombre} {user.primer_apellido}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout} title="Cerrar sesión">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
        
      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Grupos />
            </ProtectedRoute>
          } />
          <Route path="/usuarios" element={
            <ProtectedRoute>
              <Usuarios />
            </ProtectedRoute>
          } />
        </Routes>
      </Container>
      <Box component="footer" sx={{ py: 2, bgcolor: 'background.paper', mt: 'auto' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            {new Date().getFullYear()} Gestión de Comités - Todos los derechos reservados
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = useCallback(() => {
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  }, [navigate, location.state]);


  const handleLogout = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider 
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
