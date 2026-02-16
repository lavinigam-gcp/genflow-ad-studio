import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Skeleton,
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
  script: VideoScript | null;
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
  const [editJson, setEditJson] = useState(() => script ? JSON.stringify(script, null, 2) : '');
  const [editedScenes, setEditedScenes] = useState<Scene[]>(() => script ? [...script.scenes] : []);
  const [hasChanges, setHasChanges] = useState(false);

  const handleModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: 'view' | 'edit' | 'json' | null) => {
      if (!newMode || !script) return;
      setMode(newMode);
      if (newMode === 'json') {
        const currentScript = hasChanges
          ? { ...script, scenes: editedScenes }
          : script;
        setEditJson(JSON.stringify(currentScript, null, 2));
      }
      if ((newMode === 'view' || newMode === 'edit') && mode === 'json') {
        try {
          const parsed = JSON.parse(editJson) as VideoScript;
          setEditedScenes(parsed.scenes);
        } catch {
          // Invalid JSON, keep current
        }
      }
    },
    [script, hasChanges, editedScenes, mode, editJson],
  );

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

  const handleSave = useCallback(async () => {
    if (!onUpdateScript || !script) return;

    let scriptToSave: VideoScript;

    if (mode === 'json') {
      try {
        scriptToSave = JSON.parse(editJson) as VideoScript;
      } catch {
        return;
      }
    } else {
      scriptToSave = { ...script, scenes: editedScenes };
    }

    await onUpdateScript(scriptToSave);
    setHasChanges(false);
  }, [onUpdateScript, script, mode, editJson, editedScenes]);

  // Loading skeleton when script hasn't arrived yet
  if (!script) {
    return (
      <Card sx={{ maxWidth: 900, mx: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            Generating Script...
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Skeleton variant="rounded" width={200} height={32} />
            <Skeleton variant="rounded" width={60} height={32} />
            <Skeleton variant="rounded" width={80} height={32} />
          </Box>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={160}
              sx={{ mb: 2, borderRadius: 2 }}
            />
          ))}
        </CardContent>
      </Card>
    );
  }

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

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Chip label={script.video_title} color="primary" variant="outlined" />
          <Chip label={`${script.total_duration}s`} variant="outlined" />
          <Chip label={`${script.scenes.length} scenes`} variant="outlined" />
          {script.voice_style && (
            <Chip label={`Voice: ${script.voice_style}`} variant="outlined" size="small" />
          )}
          {script.negative_elements && (
            <Chip label={`Neg: ${script.negative_elements}`} variant="outlined" size="small" sx={{ maxWidth: 300 }} />
          )}
        </Box>

        {mode === 'json' ? (
          /* JSON mode — plain textarea (avoids MUI auto-scroll-to-cursor) */
          <Box
            component="textarea"
            value={editJson}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setEditJson(e.target.value);
              setHasChanges(true);
            }}
            sx={{
              width: '100%',
              maxHeight: '70vh',
              fontFamily: '"Roboto Mono", monospace',
              fontSize: 13,
              lineHeight: 1.6,
              p: 2,
              border: '1px solid',
              borderColor: '#DADCE0',
              borderRadius: 1,
              resize: 'vertical',
              overflow: 'auto',
              boxSizing: 'border-box',
              outline: 'none',
              '&:focus': { borderColor: '#1A73E8', borderWidth: 2 },
            }}
            rows={25}
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
