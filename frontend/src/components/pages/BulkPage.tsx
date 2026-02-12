import { Box, Typography } from '@mui/material';
import CSVUploader from '../bulk/CSVUploader';
import BulkJobTable from '../bulk/BulkJobTable';
import ErrorBoundary from '../common/ErrorBoundary';
import { useBulkStore } from '../../store/bulkStore';

export default function BulkPage() {
  const { jobs, uploadedFile } = useBulkStore();

  return (
    <ErrorBoundary>
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Bulk Processing
        </Typography>

        <Box sx={{ mb: 4 }}>
          <CSVUploader />
        </Box>

        {(jobs.length > 0 || uploadedFile) && <BulkJobTable jobs={jobs} />}
      </Box>
    </ErrorBoundary>
  );
}
