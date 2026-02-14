import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { CheckCircle, Cancel, Edit } from '@mui/icons-material';
import { submitReview } from '../../api/pipeline';

interface ReviewActionsProps {
  runId: string;
  onComplete?: () => void;
}

import { useNavigate } from 'react-router-dom';

type ReviewAction = 'approved' | 'rejected' | 'changes_requested';

export default function ReviewActions({ runId, onComplete }: ReviewActionsProps) {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedAction) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await submitReview(runId, selectedAction, notes || undefined);
      setSubmitted(true);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Review Submitted
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Your review has been recorded.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => navigate('/review')}
          >
            Go to Review Queue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Review Decision
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant={selectedAction === 'approved' ? 'contained' : 'outlined'}
            color="success"
            startIcon={<CheckCircle />}
            onClick={() => setSelectedAction('approved')}
            sx={{ flex: 1 }}
          >
            Approve
          </Button>
          <Button
            variant={selectedAction === 'rejected' ? 'contained' : 'outlined'}
            color="error"
            startIcon={<Cancel />}
            onClick={() => setSelectedAction('rejected')}
            sx={{ flex: 1 }}
          >
            Reject
          </Button>
          <Button
            variant={selectedAction === 'changes_requested' ? 'contained' : 'outlined'}
            color="warning"
            startIcon={<Edit />}
            onClick={() => setSelectedAction('changes_requested')}
            sx={{ flex: 1 }}
          >
            Request Changes
          </Button>
        </Box>

        {(selectedAction === 'rejected' || selectedAction === 'changes_requested') && (
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder={
              selectedAction === 'rejected'
                ? 'Reason for rejection...'
                : 'What changes are needed...'
            }
            sx={{ mb: 3 }}
          />
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={!selectedAction || isSubmitting}
          sx={{ py: 1.5 }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </CardContent>
    </Card>
  );
}
