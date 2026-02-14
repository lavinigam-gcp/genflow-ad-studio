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
  Button,
  CircularProgress,
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listJobs, getJob } from '../../api/pipeline';
import { usePipelineStore } from '../../store/pipelineStore';
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
  const [resumingId, setResumingId] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const handleResume = async (jobId: string) => {
    setResumingId(jobId);
    try {
      const job = await getJob(jobId);
      usePipelineStore.getState().loadJob(job);
      usePipelineStore.getState().addLog(`Loaded run ${jobId}`, 'info');
      navigate('/');
    } catch {
      // Failed to load — stay on page
      setResumingId(null);
    }
  };

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
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow
                    key={job.job_id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleResume(job.job_id)}
                  >
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
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          resumingId === job.job_id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <PlayArrow />
                          )
                        }
                        disabled={resumingId !== null}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResume(job.job_id);
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Resume
                      </Button>
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
