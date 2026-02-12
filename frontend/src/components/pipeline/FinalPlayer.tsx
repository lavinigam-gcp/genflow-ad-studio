import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
} from '@mui/material';
import { Download, RateReview } from '@mui/icons-material';

interface FinalPlayerProps {
  videoPath: string;
  scenesCount: number;
  totalDuration: number;
  onSubmitForReview: () => void;
  isLoading: boolean;
}

export default function FinalPlayer({
  videoPath,
  scenesCount,
  totalDuration,
  onSubmitForReview,
  isLoading,
}: FinalPlayerProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoPath;
    link.download = 'final_commercial.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card sx={{ maxWidth: 900, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Final Commercial
        </Typography>

        <Box
          sx={{
            backgroundColor: '#000',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          <video
            src={videoPath}
            controls
            style={{
              width: '100%',
              maxHeight: 500,
              display: 'block',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <Chip label={`${totalDuration}s duration`} variant="outlined" />
          <Chip label={`${scenesCount} scenes`} variant="outlined" />
          <Chip label="1080p" variant="outlined" />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleDownload}
          >
            Download
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RateReview />}
            onClick={onSubmitForReview}
            disabled={isLoading}
            sx={{ flex: 1 }}
          >
            Submit for Review
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
