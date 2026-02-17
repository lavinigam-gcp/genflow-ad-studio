import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
} from '@mui/material';
import { Download, RateReview } from '@mui/icons-material';
import { usePipelineStore } from '../../store/pipelineStore';
import ModelBadge from '../common/ModelBadge';

interface FinalPlayerProps {
  videoPath: string;
  scenesCount: number;
  totalDuration: number;
  onSubmitForReview: () => void;
  isLoading: boolean;
  aspectRatio?: string;
}

export default function FinalPlayer({
  videoPath,
  scenesCount,
  totalDuration,
  onSubmitForReview,
  isLoading,
  aspectRatio,
}: FinalPlayerProps) {
  const veoResolution = usePipelineStore((s) => s.veoResolution);
  const handleDownload = async () => {
    try {
      const response = await fetch(videoPath);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'final_commercial.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to direct link
      window.open(videoPath, '_blank');
    }
  };

  return (
    <Card sx={{ maxWidth: 900, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Final Commercial
          </Typography>
          <ModelBadge />
        </Box>

        <Box
          sx={{
            backgroundColor: 'common.black',
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
          <Chip label={veoResolution} variant="outlined" />
          {aspectRatio && (
            <Chip
              label={aspectRatio === '16:9' ? '16:9 Landscape' : '9:16 Portrait'}
              variant="outlined"
            />
          )}
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
