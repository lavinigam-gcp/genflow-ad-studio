import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Box,
  Typography,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import type { Job } from '../../types';
import { JobStatus } from '../../types';
import QCBadge from '../qc/QCBadge';

interface BulkJobTableProps {
  jobs: Job[];
}

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

function getProgressValue(job: Job): number {
  if (!job.progress) return 0;
  return Math.round((job.progress.step_index / job.progress.total_steps) * 100);
}

function JobRow({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);

  const avgQC =
    job.storyboard_results && job.storyboard_results.length > 0
      ? Math.round(
          job.storyboard_results.reduce(
            (sum, r) =>
              sum +
              (r.qc_report.avatar_validation.score + r.qc_report.product_validation.score) / 2,
            0
          ) / job.storyboard_results.length
        )
      : null;

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {job.script?.video_title || job.job_id.slice(0, 8)}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={job.status}
            color={getStatusColor(job.status)}
            size="small"
            variant="outlined"
          />
        </TableCell>
        <TableCell sx={{ width: 200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={getProgressValue(job)}
              sx={{ flex: 1, height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary">
              {getProgressValue(job)}%
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          {avgQC !== null ? <QCBadge score={avgQC} /> : <Typography variant="caption" color="text.secondary">--</Typography>}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, pl: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Job ID: {job.job_id}
              </Typography>
              {job.progress && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Current Step: {job.progress.current_step} - {job.progress.detail}
                </Typography>
              )}
              {job.error && (
                <Typography variant="body2" color="error">
                  Error: {job.error}
                </Typography>
              )}
              {job.script && (
                <Typography variant="body2" color="text.secondary">
                  Scenes: {job.script.scenes.length} | Duration: {job.script.total_duration}s
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function BulkJobTable({ jobs }: BulkJobTableProps) {
  if (jobs.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No jobs yet. Upload a CSV to start bulk processing.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 50 }} />
            <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>QC</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <JobRow key={job.job_id} job={job} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
