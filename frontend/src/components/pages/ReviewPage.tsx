import { useEffect } from 'react';
import { Box, Typography, Grid } from '@mui/material';
import ReviewQueue from '../review/ReviewQueue';
import ReviewPanel from '../review/ReviewPanel';
import ReviewActions from '../review/ReviewActions';
import ErrorBoundary from '../common/ErrorBoundary';
import { useReviewStore } from '../../store/reviewStore';
import { listJobs } from '../../api/pipeline';
import { JobStatus } from '../../types';

export default function ReviewPage() {
  const { pendingReviews, currentReview, setReviews, setCurrentReview, removeReview } =
    useReviewStore();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const jobs = await listJobs();
        const pending = jobs.filter((j) => j.status === JobStatus.COMPLETED && j.final_video_path);
        setReviews(pending);
      } catch {
        // API not available yet - that's OK during development
      }
    };
    fetchReviews();
  }, [setReviews]);

  const handleReviewComplete = () => {
    if (currentReview) {
      removeReview(currentReview.job_id);
    }
  };

  return (
    <ErrorBoundary>
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Review Queue
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <ReviewQueue
              reviews={pendingReviews}
              onSelect={setCurrentReview}
              selectedId={currentReview?.job_id ?? null}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            {currentReview ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <ReviewPanel job={currentReview} />
                <ReviewActions
                  runId={currentReview.job_id}
                  onComplete={handleReviewComplete}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 300,
                  backgroundColor: '#F8F9FA',
                  borderRadius: 2,
                  border: '1px solid #DADCE0',
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Select a job to review
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>
    </ErrorBoundary>
  );
}
