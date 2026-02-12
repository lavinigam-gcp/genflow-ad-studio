import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { ExpandMore, Replay } from '@mui/icons-material';

interface RegenAttempt {
  attempt: number;
  scoreBefore: number;
  feedback: string;
  scoreAfter: number;
}

interface RegenerationLogProps {
  attempts: RegenAttempt[];
}

export default function RegenerationLog({ attempts }: RegenerationLogProps) {
  if (attempts.length === 0) return null;

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: 'none',
        '&::before': { display: 'none' },
        backgroundColor: 'transparent',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ fontSize: 18 }} />}
        sx={{
          minHeight: 32,
          px: 0,
          '& .MuiAccordionSummary-content': { my: 0.5 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Replay sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {attempts.length} regeneration attempt{attempts.length > 1 ? 's' : ''}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0 }}>
        {attempts.map((attempt) => (
          <Box
            key={attempt.attempt}
            sx={{
              mb: 1.5,
              pl: 2,
              borderLeft: '2px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Attempt {attempt.attempt}
              </Typography>
              <Chip
                label={`${attempt.scoreBefore} -> ${attempt.scoreAfter}`}
                size="small"
                color={attempt.scoreAfter > attempt.scoreBefore ? 'success' : 'warning'}
                variant="outlined"
                sx={{ height: 20, fontSize: 11 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              {attempt.feedback}
            </Typography>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
