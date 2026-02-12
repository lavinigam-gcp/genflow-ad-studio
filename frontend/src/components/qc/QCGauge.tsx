import { Box, Typography } from '@mui/material';
import { Gauge } from '@mui/x-charts/Gauge';

interface QCGaugeProps {
  value: number;
  label: string;
}

function getColor(value: number): string {
  if (value >= 80) return '#1E8E3E';
  if (value >= 60) return '#E8710A';
  return '#D93025';
}

export default function QCGauge({ value, label }: QCGaugeProps) {
  const color = getColor(value);

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Gauge
        value={value}
        startAngle={-110}
        endAngle={110}
        width={100}
        height={80}
        sx={{
          '& .MuiGauge-valueArc': {
            fill: color,
          },
          '& .MuiGauge-referenceArc': {
            fill: '#E8EAED',
          },
          '& .MuiGauge-valueText': {
            fontSize: 16,
            fontWeight: 600,
            fill: color,
          },
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: -1, display: 'block' }}>
        {label}
      </Typography>
    </Box>
  );
}
