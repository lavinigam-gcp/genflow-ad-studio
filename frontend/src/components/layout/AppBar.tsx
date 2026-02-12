import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { VideoLibrary } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Pipeline', path: '/' },
  { label: 'Bulk', path: '/bulk' },
  { label: 'Review', path: '/review' },
  { label: 'History', path: '/history' },
];

export default function AppBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <MuiAppBar position="static" color="default" elevation={0}>
      <Toolbar sx={{ gap: 2 }}>
        <VideoLibrary sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Google Sans", Roboto, system-ui',
            fontWeight: 600,
            color: 'text.primary',
            mr: 4,
          }}
        >
          Genflow Ad Studio
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  color: isActive ? 'primary.main' : 'text.secondary',
                  backgroundColor: isActive ? 'primary.light' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  px: 2,
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.light' : 'action.hover',
                  },
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
}
