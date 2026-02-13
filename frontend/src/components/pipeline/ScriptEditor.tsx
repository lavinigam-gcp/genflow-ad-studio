import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Chip,
} from '@mui/material';
import {
  Visibility,
  Edit,
  Code,
  ArrowForward,
  Save,
} from '@mui/icons-material';
import type { VideoScript, Scene } from '../../types';
import SceneCard from './SceneCard';
import TransitionIndicator from './TransitionIndicator';

interface ScriptEditorProps {
  script: VideoScript;
  onContinue: () => void;
  onUpdateScript?: (script: VideoScript) => Promise<void>;
  isLoading: boolean;
  readOnly?: boolean;
}

export default function ScriptEditor({
  script,
  onContinue,
  onUpdateScript,
  isLoading,
  readOnly = false,
}: ScriptEditorProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'json'>('view');
  const [editJson, setEditJson] = useState(() => JSON.stringify(script, null, 2));
  const [editedScenes, setEditedScenes] = useState<Scene[]>(() => [...script.scenes]);
  const [hasChanges, setHasChanges] = useState(false);

  const handleModeChange = (
    _: React.MouseEvent<HTMLElement>,
    newMode: 'view' | 'edit' | 'json' | null,
  ) => {
    if (newMode) {
      setMode(newMode);
      if (newMode === 'json') {
        // Sync JSON view with current state (edited scenes or original)
        const currentScript = hasChanges
          ? { ...script, scenes: editedScenes }
          : script;
        setEditJson(JSON.stringify(currentScript, null, 2));
      }
      if (newMode === 'view' || newMode === 'edit') {
        // Sync scenes from JSON if JSON was edited
        if (mode === 'json') {
          try {
            const parsed = JSON.parse(editJson) as VideoScript;
            setEditedScenes(parsed.scenes);
          } catch {
            // Invalid JSON, keep current edited scenes
          }
        }
      }
    }
  };

  const handleSceneChange = useCallback(
    (index: number, updated: Scene) => {
      setEditedScenes((prev) => {
        const next = [...prev];
        next[index] = updated;
        return next;
      });
      setHasChanges(true);
    },
    [],
  );

  const handleTransitionChange = useCallback(
    (
      sceneIndex: number,
      updates: {
        transition_type: string;
        transition_duration: number;
        audio_continuity: string;
      },
    ) => {
      setEditedScenes((prev) => {
        const next = [...prev];
        next[sceneIndex] = { ...next[sceneIndex], ...updates };
        return next;
      });
      setHasChanges(true);
    },
    [],
  );

  const handleSave = async () => {
    if (!onUpdateScript) return;

    let scriptToSave: VideoScript;

    if (mode === 'json') {
      try {
        scriptToSave = JSON.parse(editJson) as VideoScript;
      } catch {
        return; // Invalid JSON
      }
    } else {
      scriptToSave = { ...script, scenes: editedScenes };
    }

    await onUpdateScript(scriptToSave);
    setHasChanges(false);
  };

  const isEditing = mode === 'edit';
  const displayScenes = isEditing ? editedScenes : script.scenes;

  return (
    <Card sx={{ maxWidth: 900, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
          }}
        >
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
            <ToggleButton value="json">
              <Code sx={{ mr: 0.5, fontSize: 18 }} />
              JSON
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip label={script.video_title} color="primary" variant="outlined" />
          <Chip label={`${script.total_duration}s`} variant="outlined" />
          <Chip label={`${script.scenes.length} scenes`} variant="outlined" />
        </Box>

        {mode === 'json' ? (
          /* JSON mode — raw JSON editor for power users */
          <TextField
            fullWidth
            multiline
            value={editJson}
            onChange={(e) => {
              setEditJson(e.target.value);
              setHasChanges(true);
            }}
            slotProps={{
              input: {
                sx: {
                  fontFamily: '"Roboto Mono", monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                },
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': { maxHeight: 500, overflow: 'auto' },
            }}
          />
        ) : (
          /* View and Edit modes — visual scene cards */
          <Box
            sx={{
              maxHeight: 600,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
            }}
          >
            {displayScenes.map((scene, index) => (
              <Box key={scene.scene_number}>
                <SceneCard
                  scene={scene}
                  isEditing={isEditing && !readOnly}
                  onChange={(updated) => !readOnly && handleSceneChange(index, updated)}
                />
                {/* Show transition indicator between scenes (not after last) */}
                {index < displayScenes.length - 1 && (
                  <TransitionIndicator
                    transitionType={scene.transition_type ?? 'cut'}
                    transitionDuration={scene.transition_duration ?? 0.5}
                    audioContinuity={scene.audio_continuity ?? ''}
                    isEditing={isEditing && !readOnly}
                    onChange={(updates) => !readOnly && handleTransitionChange(index, updates)}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Save button (visible when there are unsaved changes) */}
        {hasChanges && onUpdateScript && !readOnly && (
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={handleSave}
            disabled={isLoading}
            startIcon={<Save />}
            sx={{ mt: 2, py: 1 }}
          >
            Save Changes
          </Button>
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={onContinue}
          disabled={isLoading || readOnly}
          endIcon={<ArrowForward />}
          sx={{ mt: 2, py: 1.5 }}
        >
          Continue to Avatar Generation
        </Button>
      </CardContent>
    </Card>
  );
}
