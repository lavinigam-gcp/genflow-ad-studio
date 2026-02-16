import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  colorSchemes: {
    light: {
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
    },
    dark: {
      palette: {
        primary: {
          main: '#8AB4F8',
          light: '#1A3A6B',
          dark: '#5E9BF0',
        },
        secondary: {
          main: '#9AA0A6',
        },
        success: {
          main: '#81C995',
          light: '#1B3726',
        },
        warning: {
          main: '#FDD663',
        },
        error: {
          main: '#F28B82',
          light: '#3C2020',
        },
        background: {
          default: '#1E1E1E',
          paper: '#2D2D2D',
        },
        text: {
          primary: '#E8EAED',
          secondary: '#9AA0A6',
        },
        divider: '#3C4043',
      },
    },
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
        containedPrimary: ({ theme }) => ({
          background: 'linear-gradient(135deg, #1A73E8 0%, #4285F4 100%)',
          color: '#FFFFFF',
          '&:hover': {
            background: 'linear-gradient(135deg, #1558B0 0%, #3B78DB 100%)',
          },
          ...theme.applyStyles('dark', {
            background: 'linear-gradient(135deg, #8AB4F8 0%, #5E9BF0 100%)',
            color: '#1E1E1E',
            '&:hover': {
              background: 'linear-gradient(135deg, #5E9BF0 0%, #4A8AE0 100%)',
            },
          }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(26,115,232,0.12)',
            borderColor: '#B4D0F0',
            transform: 'translateY(-1px)',
          },
          ...theme.applyStyles('dark', {
            '&:hover': {
              boxShadow: '0 4px 16px rgba(138,180,248,0.08)',
              borderColor: '#5E9BF0',
            },
          }),
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          boxShadow: 'none',
          border: `1px solid ${theme.palette.divider}`,
        }),
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
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: ({ theme }) => ({
          borderColor: theme.palette.divider,
          borderTopWidth: 2,
        }),
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
        root: ({ theme }) => ({
          '& .MuiTableCell-head': {
            backgroundColor: '#F1F3F4',
            color: theme.palette.text.primary,
          },
          ...theme.applyStyles('dark', {
            '& .MuiTableCell-head': {
              backgroundColor: '#353535',
            },
          }),
        }),
      },
    },
  },
});
