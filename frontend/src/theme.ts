import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1A73E8',
      light: '#D2E3FC',
      dark: '#1558B0',
    },
    secondary: {
      main: '#5F6368',
    },
    success: {
      main: '#1E8E3E',
      light: '#CEEAD6',
    },
    warning: {
      main: '#E8710A',
    },
    error: {
      main: '#D93025',
      light: '#FCE8E6',
    },
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#202124',
      secondary: '#5F6368',
    },
    divider: '#DADCE0',
  },
  typography: {
    fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
    h1: {
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 600,
    },
    h2: {
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 500,
    },
    h6: {
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
    },
    body2: {
      fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
    },
    button: {
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 500,
    },
    caption: {
      fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
    },
    overline: {
      fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none' as const,
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1A73E8 0%, #4285F4 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1558B0 0%, #3B78DB 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #DADCE0',
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(26,115,232,0.12)',
            borderColor: '#B4D0F0',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #DADCE0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined' as const,
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#202124',
          boxShadow: 'none',
          borderBottom: '1px solid #DADCE0',
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: '#DADCE0',
          borderTopWidth: 2,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F1F3F4',
          },
        },
      },
    },
  },
});
