import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  LinearProgress,
  Box,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

interface QCDimension {
  label: string;
  score: number;
  reasoning: string;
}

interface QCDetailPanelProps {
  dimensions: QCDimension[];
}

function getProgressColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
}

export default function QCDetailPanel({ dimensions }: QCDetailPanelProps) {
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
        <Typography variant="caption" color="text.secondary">
          QC Details
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0 }}>
        {dimensions.map((dim) => (
          <Box key={dim.label} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {dim.label}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {dim.score}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={dim.score}
              color={getProgressColor(dim.score)}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mt: 0.25,
                fontSize: 11,
                lineHeight: 1.3,
              }}
            >
              {dim.reasoning}
            </Typography>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
