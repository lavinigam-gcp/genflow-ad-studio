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
          light: '#E8F0FE',
          dark: '#1558B0',
        },
        secondary: {
          main: '#5F6368',
        },
        success: {
          main: '#1E8E3E',
          light: '#E6F4EA',
        },
        warning: {
          main: '#F9AB00',
          light: '#FEF7E0',
        },
        error: {
          main: '#D93025',
          light: '#FCE8E6',
        },
        background: {
          default: '#FAFAFA',
          paper: '#FFFFFF',
        },
        text: {
          primary: '#202124',
          secondary: '#5F6368',
        },
        divider: 'rgba(0,0,0,0.08)',
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#A8C7FA',
          light: '#0842A0',
          dark: '#D3E3FD',
        },
        secondary: {
          main: '#C4C7C5',
          light: '#474747',
        },
        success: {
          main: '#81C995',
          light: '#1B3726',
        },
        warning: {
          main: '#FDE293',
          light: '#4D360B',
        },
        error: {
          main: '#F28B82',
          light: '#3C2020',
        },
        background: {
          default: '#131314', // Google true dark
          paper: '#1E1F20',   // Elevated dark surface
        },
        text: {
          primary: '#E3E3E3',
          secondary: '#C4C7C5',
        },
        divider: 'rgba(255,255,255,0.08)',
      },
    },
  },
  typography: {
    fontFamily: '"Outfit", "Google Sans", Roboto, system-ui, -apple-system, sans-serif',
    h1: {
      fontFamily: '"Outfit", "Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Outfit", "Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.01em',
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
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      letterSpacing: '0.01em',
    },
    body2: {
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      letterSpacing: '0.01em',
    },
    button: {
      fontFamily: '"Outfit", "Google Sans", Roboto, system-ui, -apple-system, sans-serif',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    caption: {
      fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, sans-serif',
    },
    overline: {
      fontFamily: '"Outfit", system-ui, -apple-system, sans-serif',
      letterSpacing: '0.06em',
      fontWeight: 600,
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 999, // Pill shape M3
          textTransform: 'none' as const,
          fontWeight: 600,
          boxShadow: 'none',
          padding: '8px 20px',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          ...theme.applyStyles('dark', {
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            },
          })
        }),
        containedPrimary: ({ theme }) => ({
          background: 'linear-gradient(135deg, #1A73E8 0%, #4285F4 100%)',
          color: '#FFFFFF',
          '&:hover': {
            background: 'linear-gradient(135deg, #1558B0 0%, #3B78DB 100%)',
            boxShadow: '0 4px 12px rgba(26,115,232,0.3)',
          },
          ...theme.applyStyles('dark', {
            background: 'linear-gradient(135deg, #A8C7FA 0%, #8AB4F8 100%)',
            color: '#0842A0',
            '&:hover': {
              background: 'linear-gradient(135deg, #D3E3FD 0%, #A8C7FA 100%)',
              boxShadow: '0 4px 12px rgba(168,199,250,0.3)',
            },
          }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 24,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
          backgroundColor: '#FFFFFF',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundImage: 'none',
          '&:hover': {
            boxShadow: '0 12px 32px rgba(26,115,232,0.05)',
            transform: 'translateY(-4px)',
          },
          ...theme.applyStyles('dark', {
            backgroundColor: '#1E1F20',
            '&:hover': {
              boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            }
          })
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 24,
          boxShadow: 'none',
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          ...theme.applyStyles('dark', {
            backgroundColor: '#1E1F20', // dark surface container
          })
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
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'box-shadow 0.2s ease',
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.01)',
            },
            '&.Mui-focused': {
              backgroundColor: 'transparent',
              boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
            },
          },
          ...theme.applyStyles('dark', {
            '& .MuiOutlinedInput-root': {
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.01)',
              },
              '&.Mui-focused': {
                boxShadow: `0 0 0 2px ${theme.palette.primary.dark}`,
              },
            }
          })
        })
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: 'transparent',
          color: theme.palette.text.primary,
          boxShadow: 'none',
          backgroundImage: 'none',
          borderBottom: 'none',
          transition: 'background-color 0.3s ease',
          ...theme.applyStyles('dark', {
            backgroundColor: 'transparent',
            backgroundImage: 'none',
          })
        }),
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: ({ theme }) => ({
          borderColor: theme.palette.divider,
          borderTopWidth: 3,
          borderRadius: 2,
        }),
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 6,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiTableCell-head': {
            backgroundColor: '#F1F3F4',
            color: theme.palette.text.primary,
            fontWeight: 600,
          },
          ...theme.applyStyles('dark', {
            '& .MuiTableCell-head': {
              backgroundColor: '#282A2C',
              color: '#E3E3E3',
            },
          }),
        }),
      },
    },
  },
});
