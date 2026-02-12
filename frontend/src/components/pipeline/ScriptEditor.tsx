import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Chip,
} from '@mui/material';
import { Visibility, Edit, ArrowForward } from '@mui/icons-material';
import type { VideoScript } from '../../types';

interface ScriptEditorProps {
  script: VideoScript;
  onContinue: () => void;
  isLoading: boolean;
}

export default function ScriptEditor({ script, onContinue, isLoading }: ScriptEditorProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editJson, setEditJson] = useState(() => JSON.stringify(script, null, 2));

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'view' | 'edit' | null) => {
    if (newMode) {
      setMode(newMode);
      if (newMode === 'edit') {
        setEditJson(JSON.stringify(script, null, 2));
      }
    }
  };

  return (
    <Card sx={{ maxWidth: 900, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Generated Script
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <ToggleButton value="view">
              <Visibility sx={{ mr: 0.5, fontSize: 18 }} />
              View
            </ToggleButton>
            <ToggleButton value="edit">
              <Edit sx={{ mr: 0.5, fontSize: 18 }} />
              Edit
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip label={script.video_title} color="primary" variant="outlined" />
          <Chip label={`${script.total_duration}s`} variant="outlined" />
          <Chip label={`${script.scenes.length} scenes`} variant="outlined" />
        </Box>

        {mode === 'view' ? (
          <Paper
            sx={{
              p: 3,
              backgroundColor: '#F8F9FA',
              maxHeight: 500,
              overflow: 'auto',
            }}
          >
            <pre
              style={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: 13,
                lineHeight: 1.6,
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(script, null, 2)}
            </pre>
          </Paper>
        ) : (
          <TextField
            fullWidth
            multiline
            value={editJson}
            onChange={(e) => setEditJson(e.target.value)}
            slotProps={{
              input: {
                sx: {
                  fontFamily: '"Roboto Mono", monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                },
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { maxHeight: 500, overflow: 'auto' } }}
          />
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={onContinue}
          disabled={isLoading}
          endIcon={<ArrowForward />}
          sx={{ mt: 3, py: 1.5 }}
        >
          Continue to Avatar Generation
        </Button>
      </CardContent>
    </Card>
  );
}
