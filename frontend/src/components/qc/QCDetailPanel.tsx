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
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px !important',
        '&::before': { display: 'none' },
        backgroundColor: 'background.paper',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ fontSize: 18 }} />}
        sx={{
          minHeight: 48,
          px: 2,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '0.01em' }}>
          QC Details
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0 }}>
        {dimensions.map((dim) => (
          <Box key={dim.label} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {dim.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
                mt: 0.5,
                fontSize: 12,
                lineHeight: 1.4,
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
