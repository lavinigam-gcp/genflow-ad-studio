import { Box, Typography } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';

interface ModelBadgeProps {
  label?: string;
  sx?: SxProps<Theme>;
}

export default function ModelBadge({ label = 'Nano Banana Pro', sx }: ModelBadgeProps) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(90deg, transparent 0%, var(--mui-palette-primary-main) 50%, transparent 100%)',
          opacity: 0.08,
          animation: 'badgeShimmer 3s ease-in-out infinite',
        },
        '@keyframes badgeShimmer': {
          '0%': { left: '-100%' },
          '100%': { left: '200%' },
        },
        ...sx,
      }}
    >
      <AutoAwesome sx={{ fontSize: 16, color: 'primary.main' }} />
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          letterSpacing: 0.5,
          color: 'text.primary',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
