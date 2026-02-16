import { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
  TextField,
  Grid,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import type { Scene } from '../../types';

interface SceneCardProps {
  scene: Scene;
  isEditing: boolean;
  onChange: (updated: Scene) => void;
}

export default function SceneCard({ scene, isEditing, onChange }: SceneCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (field: keyof Scene, value: string) => {
    onChange({ ...scene, [field]: value });
  };

  return (
    <Card variant="outlined" sx={{ borderColor: '#DADCE0', backgroundColor: '#F8F9FA', borderLeft: '3px solid #1A73E8' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* Header row: scene number, scene type, duration */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {scene.scene_number}
          </Box>
          <Chip
            label={scene.scene_type}
            color="primary"
            size="small"
            sx={{ fontWeight: 500 }}
          />
          <Chip
            label={`${scene.duration_seconds}s`}
            variant="outlined"
            size="small"
            sx={{ borderColor: '#DADCE0' }}
          />
        </Box>

        {/* Two-column layout: shot info + dialogue */}
        <Grid container spacing={2}>
          {/* Left column: shot info */}
          <Grid size={{ xs: 12, sm: 5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <LabeledField
                label="Shot Type"
                value={scene.shot_type}
                field="shot_type"
                isEditing={isEditing}
                onChange={handleChange}
              />
              <LabeledField
                label="Camera"
                value={scene.camera_movement}
                field="camera_movement"
                isEditing={isEditing}
                onChange={handleChange}
              />
              <LabeledField
                label="Lighting"
                value={scene.lighting}
                field="lighting"
                isEditing={isEditing}
                onChange={handleChange}
              />
            </Box>
          </Grid>

          {/* Right column: dialogue */}
          <Grid size={{ xs: 12, sm: 7 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}
            >
              Dialogue
            </Typography>
            {isEditing ? (
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                value={scene.script_dialogue}
                onChange={(e) => handleChange('script_dialogue', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.95rem' } }}
              />
            ) : (
              <Box
                sx={{
                  borderLeft: '3px solid',
                  borderColor: '#1A73E8',
                  pl: 1.5,
                  py: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontStyle: 'italic',
                    fontSize: '0.95rem',
                    color: 'text.primary',
                    lineHeight: 1.6,
                  }}
                >
                  &ldquo;{scene.script_dialogue}&rdquo;
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>

        {/* Expand/collapse toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
          <IconButton
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            sx={{ color: 'text.secondary' }}
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {/* Expandable detail row */}
        <Collapse in={expanded}>
          <Box
            sx={{
              mt: 1,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: '#DADCE0',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <LabeledField
                  label="Avatar Action"
                  value={scene.avatar_action}
                  field="avatar_action"
                  isEditing={isEditing}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <LabeledField
                  label="Avatar Emotion"
                  value={scene.avatar_emotion}
                  field="avatar_emotion"
                  isEditing={isEditing}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            <LabeledField
              label="Product Visual Integration"
              value={scene.product_visual_integration}
              field="product_visual_integration"
              isEditing={false}
              onChange={handleChange}
            />

            <LabeledField
              label="Sound Design"
              value={scene.sound_design}
              field="sound_design"
              isEditing={isEditing}
              onChange={handleChange}
            />

            <LabeledField
              label="Visual Background"
              value={scene.visual_background}
              field="visual_background"
              isEditing={false}
              onChange={handleChange}
            />

            {scene.voice_style && (
              <LabeledField
                label="Voice Style"
                value={scene.voice_style}
                field="voice_style"
                isEditing={isEditing}
                onChange={handleChange}
              />
            )}

            {scene.negative_elements && (
              <LabeledField
                label="Negative Elements"
                value={scene.negative_elements}
                field="negative_elements"
                isEditing={isEditing}
                onChange={handleChange}
              />
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

interface LabeledFieldProps {
  label: string;
  value: string;
  field: keyof Scene;
  isEditing: boolean;
  onChange: (field: keyof Scene, value: string) => void;
}

function LabeledField({ label, value, field, isEditing, onChange }: LabeledFieldProps) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.25, display: 'block' }}
      >
        {label}
      </Typography>
      {isEditing ? (
        <TextField
          fullWidth
          size="small"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
        />
      ) : (
        <Chip
          label={value}
          size="small"
          variant="outlined"
          sx={{ borderColor: '#DADCE0', maxWidth: '100%' }}
        />
      )}
    </Box>
  );
}
