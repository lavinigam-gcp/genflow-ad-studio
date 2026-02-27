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
        expandIcon={<ExpandMore sx={{ fontSize: 20 }} />}
        sx={{
          minHeight: 52,
          px: 2,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Typography variant="body2" sx={{ fontFamily: '"Google Sans", sans-serif', fontSize: 15, fontWeight: 700, color: 'text.primary', letterSpacing: '0.01em' }}>
          QC Details
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {dimensions.map((dim) => {
            const normScore = dim.score <= 10 ? dim.score * 10 : dim.score;
            return (
              <Box
                key={dim.label}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontFamily: '"Google Sans", sans-serif', fontSize: 14, fontWeight: 700, color: 'text.primary' }}>
                    {dim.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: '"Google Sans", sans-serif', fontSize: 14, fontWeight: 700, color: getProgressColor(normScore) + '.main' }}>
                    {dim.score}
                    {dim.score <= 10 && <Typography component="span" variant="caption" color="text.secondary" sx={{ fontFamily: '"Google Sans", sans-serif', fontSize: 12, ml: 0.5 }}>/ 10</Typography>}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={normScore}
                  color={getProgressColor(normScore)}
                  sx={{ height: 6, borderRadius: 3, mb: 1, backgroundColor: 'action.hover' }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontFamily: '"Google Sans", sans-serif',
                    display: 'block',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {dim.reasoning}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
