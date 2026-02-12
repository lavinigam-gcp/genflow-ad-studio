import {
  Box,
  Typography,
  Card,
  CardMedia,
  Grid,
} from '@mui/material';
import QCBadge from '../qc/QCBadge';
import type { Job } from '../../types';

interface ReviewPanelProps {
  job: Job;
}

export default function ReviewPanel({ job }: ReviewPanelProps) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {job.script?.video_title || `Job ${job.job_id.slice(0, 8)}`}
      </Typography>

      <Grid container spacing={3}>
        {/* Left: Storyboard images */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
            Storyboard
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {job.storyboard_results?.map((scene) => (
              <Card key={scene.scene_number}>
                <CardMedia
                  component="img"
                  height={180}
                  image={scene.image_path}
                  alt={`Scene ${scene.scene_number}`}
                  sx={{ objectFit: 'cover' }}
                />
                <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Scene {scene.scene_number}
                  </Typography>
                  <QCBadge score={scene.qc_report.avatar_validation.score} label="Avatar" />
                  <QCBadge score={scene.qc_report.product_validation.score} label="Product" />
                </Box>
              </Card>
            )) ?? (
              <Typography variant="body2" color="text.secondary">
                No storyboard data available
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Right: Video clips */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
            Video Clips
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {job.video_results?.map((scene) => (
              <Card key={scene.scene_number}>
                <Box sx={{ backgroundColor: '#000' }}>
                  <video
                    src={scene.selected_video_path}
                    controls
                    style={{ width: '100%', height: 180, objectFit: 'contain' }}
                  />
                </Box>
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Scene {scene.scene_number} (Variant {scene.selected_index + 1})
                  </Typography>
                </Box>
              </Card>
            )) ?? (
              <Typography variant="body2" color="text.secondary">
                No video data available
              </Typography>
            )}
          </Box>

          {/* Final video if available */}
          {job.final_video_path && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                Final Commercial
              </Typography>
              <Card>
                <Box sx={{ backgroundColor: '#000' }}>
                  <video
                    src={job.final_video_path}
                    controls
                    style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }}
                  />
                </Box>
              </Card>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
