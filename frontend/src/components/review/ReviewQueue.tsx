import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { Schedule } from '@mui/icons-material';
import type { Job } from '../../types';

interface ReviewQueueProps {
  reviews: Job[];
  onSelect: (job: Job) => void;
  selectedId: string | null;
}

export default function ReviewQueue({ reviews, onSelect, selectedId }: ReviewQueueProps) {
  if (reviews.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No items pending review
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Pending Reviews ({reviews.length})
      </Typography>

      {reviews.map((job) => (
        <Card
          key={job.job_id}
          sx={{
            border: selectedId === job.job_id ? '2px solid #1A73E8' : '1px solid #DADCE0',
          }}
        >
          <CardActionArea onClick={() => onSelect(job)}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {job.script?.video_title || `Job ${job.job_id.slice(0, 8)}`}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Schedule sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(job.updated_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {job.script && (
                    <Chip label={`${job.script.scenes.length} scenes`} size="small" variant="outlined" />
                  )}
                  <Chip label="Review" color="warning" size="small" />
                </Box>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
