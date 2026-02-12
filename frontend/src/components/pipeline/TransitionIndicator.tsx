import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  ContentCut,
  BlurOn,
  Gradient,
  SwapHoriz,
  ZoomIn,
  CompareArrows,
  Speed,
  ArrowDownward,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';

interface TransitionIndicatorProps {
  transitionType: string;
  transitionDuration: number;
  audioContinuity: string;
  isEditing: boolean;
  onChange: (updates: {
    transition_type: string;
    transition_duration: number;
    audio_continuity: string;
  }) => void;
}

const TRANSITION_OPTIONS = [
  'cut',
  'dissolve',
  'fade',
  'wipe',
  'zoom',
  'match_cut',
  'whip_pan',
] as const;

const TRANSITION_LABELS: Record<string, string> = {
  cut: 'Cut',
  dissolve: 'Dissolve',
  fade: 'Fade',
  wipe: 'Wipe',
  zoom: 'Zoom',
  match_cut: 'Match Cut',
  whip_pan: 'Whip Pan',
};

const TRANSITION_ICONS: Record<string, SvgIconComponent> = {
  cut: ContentCut,
  dissolve: BlurOn,
  fade: Gradient,
  wipe: SwapHoriz,
  zoom: ZoomIn,
  match_cut: CompareArrows,
  whip_pan: Speed,
};

function getTransitionIcon(type: string): SvgIconComponent {
  return TRANSITION_ICONS[type] || ArrowDownward;
}

function getTransitionLabel(type: string): string {
  return TRANSITION_LABELS[type] || type;
}

export default function TransitionIndicator({
  transitionType,
  transitionDuration,
  audioContinuity,
  isEditing,
  onChange,
}: TransitionIndicatorProps) {
  const IconComponent = getTransitionIcon(transitionType);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 0.5,
      }}
    >
      {/* Top vertical line */}
      <Box
        sx={{
          width: 2,
          height: 20,
          bgcolor: '#DADCE0',
        }}
      />

      {/* Badge / edit controls */}
      {isEditing ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#F8F9FA',
            border: '1px solid #DADCE0',
            borderRadius: '12px',
            px: 2,
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Select
              size="small"
              value={transitionType}
              onChange={(e) =>
                onChange({
                  transition_type: e.target.value,
                  transition_duration: transitionDuration,
                  audio_continuity: audioContinuity,
                })
              }
              sx={{ fontSize: '0.75rem', minWidth: 120 }}
            >
              {TRANSITION_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontSize: '0.75rem' }}>
                  {getTransitionLabel(opt)}
                </MenuItem>
              ))}
            </Select>
            <TextField
              type="number"
              size="small"
              value={transitionDuration}
              onChange={(e) =>
                onChange({
                  transition_type: transitionType,
                  transition_duration: parseFloat(e.target.value) || 0,
                  audio_continuity: audioContinuity,
                })
              }
              slotProps={{
                htmlInput: { step: 0.1, min: 0, max: 2 },
              }}
              sx={{ width: 80, '& input': { fontSize: '0.75rem' } }}
            />
          </Box>
          <TextField
            size="small"
            placeholder="Audio continuity"
            value={audioContinuity}
            onChange={(e) =>
              onChange({
                transition_type: transitionType,
                transition_duration: transitionDuration,
                audio_continuity: e.target.value,
              })
            }
            sx={{
              width: '100%',
              '& input': { fontSize: '0.7rem', fontStyle: 'italic' },
            }}
          />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {/* Read-only pill badge */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: '#F8F9FA',
              border: '1px solid #DADCE0',
              borderRadius: '12px',
              px: 1.5,
              py: 0.5,
            }}
          >
            <IconComponent sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography
              sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.primary' }}
            >
              {getTransitionLabel(transitionType)}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {transitionDuration}s
            </Typography>
          </Box>

          {/* Audio continuity caption */}
          {audioContinuity && (
            <Typography
              sx={{
                fontSize: '0.7rem',
                fontStyle: 'italic',
                color: 'text.secondary',
                maxWidth: 300,
                textAlign: 'center',
              }}
            >
              {audioContinuity}
            </Typography>
          )}
        </Box>
      )}

      {/* Bottom vertical line */}
      <Box
        sx={{
          width: 2,
          height: 20,
          bgcolor: '#DADCE0',
        }}
      />
    </Box>
  );
}
