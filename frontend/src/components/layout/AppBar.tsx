import {
  AppBar as MuiAppBar,
  Toolbar,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function AppBar() {
  const navigate = useNavigate();

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
        <Box
          component="img"
          src="/logo.png"
          alt="Genflow Ad Studio"
          sx={{
            height: 100,
            width: 'auto',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        />
      </Toolbar>
    </MuiAppBar>
  );
}
