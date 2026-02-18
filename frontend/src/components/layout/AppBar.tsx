import {
  AppBar as MuiAppBar,
  Toolbar,
  Box,
} from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function AppBar() {
  const navigate = useNavigate();
  const { mode } = useColorScheme();

  return (
    <MuiAppBar
      position="static"
      color="default"
      elevation={0}
      sx={{ borderBottom: 'none', boxShadow: 'none' }}
    >
      <Toolbar
        sx={{
          justifyContent: 'center',
          py: 1.5,
          minHeight: 'auto !important',
        }}
      >
        {/* Spacer to keep logo centered */}
        <Box sx={{ width: 40 }} />

        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Genflow Ad Studio"
            sx={{
              height: 100,
              width: 'auto',
              cursor: 'pointer',
              filter: mode === 'dark' ? 'invert(1) hue-rotate(180deg) brightness(1.2)' : 'none',
              mixBlendMode: mode === 'dark' ? 'lighten' : 'normal',
              transition: 'all 0.3s ease',
            }}
            onClick={() => navigate('/')}
          />
        </Box>

        <ThemeToggle />
      </Toolbar>
    </MuiAppBar>
  );
}
