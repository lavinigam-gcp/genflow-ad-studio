import { Chip } from '@mui/material';
import { CheckCircle, Warning, Error } from '@mui/icons-material';

interface QCBadgeProps {
  score: number;
  label?: string;
}

export default function QCBadge({ score, label }: QCBadgeProps) {
  if (score >= 80) {
    return (
      <Chip
        icon={<CheckCircle sx={{ fontSize: 16 }} />}
        label={label ? `${label}: ${score}` : `Pass: ${score}`}
        color="success"
        size="small"
        variant="outlined"
      />
    );
  }

  if (score >= 60) {
    return (
      <Chip
        icon={<Warning sx={{ fontSize: 16 }} />}
        label={label ? `${label}: ${score}` : `Warn: ${score}`}
        color="warning"
        size="small"
        variant="outlined"
      />
    );
  }

  return (
    <Chip
      icon={<Error sx={{ fontSize: 16 }} />}
      label={label ? `${label}: ${score}` : `Fail: ${score}`}
      color="error"
      size="small"
      variant="outlined"
    />
  );
}
