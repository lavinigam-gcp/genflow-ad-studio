import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { listJobs } from '../../api/pipeline';
import { JobStatus, type Job } from '../../types';
import ErrorBoundary from '../common/ErrorBoundary';

function getStatusColor(status: JobStatus): 'default' | 'primary' | 'success' | 'error' | 'warning' {
  switch (status) {
    case JobStatus.COMPLETED:
      return 'success';
    case JobStatus.RUNNING:
      return 'primary';
    case JobStatus.FAILED:
      return 'error';
    case JobStatus.CANCELLED:
      return 'warning';
    default:
      return 'default';
  }
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await listJobs();
        setJobs(data);
      } catch {
        // API not available yet
      } finally {
        setLoaded(true);
      }
    };
    fetch();
  }, []);

  return (
    <ErrorBoundary>
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Pipeline History
        </Typography>

        {loaded && jobs.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <CardContent>
              <Typography variant="body1" color="text.secondary">
                No pipeline runs yet. Start a campaign from the Pipeline tab.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Job ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.job_id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: 12 }}>
                        {job.job_id.slice(0, 12)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {job.script?.video_title || '--'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        color={getStatusColor(job.status)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(job.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(job.updated_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </ErrorBoundary>
  );
}
