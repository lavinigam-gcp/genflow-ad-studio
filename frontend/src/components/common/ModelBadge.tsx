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
        px: 2,
        py: 0.75,
        borderRadius: 999,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(26, 115, 232, 0.15) 50%, transparent 100%)',
          animation: 'badgeShimmer 3s ease-in-out infinite',
        },
        '.dark &::after': {
          background:
            'linear-gradient(90deg, transparent 0%, rgba(168, 199, 250, 0.15) 50%, transparent 100%)',
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
