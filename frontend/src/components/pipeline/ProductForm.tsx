import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Box,
  Chip,

  IconButton,
  Tab,
  Tabs,
  Alert,
  Select,
  MenuItem,
  FormControl,
  Slider,
  Tooltip,
  Grid,
  Paper,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  AutoAwesome,
  Inventory2,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Link as LinkIcon,
  Image as ImageIcon,
  AutoFixHigh,
} from '@mui/icons-material';
import type { ScriptRequest, SampleProduct } from '../../types';
import { AD_TONES, GEMINI_MODELS } from '../../constants/controls';
import {
  listSamples,
  uploadImage,
  generateProductImage,
  analyzeImage,
} from '../../api/pipeline';

interface ProductFormProps {
  onSubmit: (request: ScriptRequest) => Promise<void>;
  isLoading: boolean;
  readOnly?: boolean;
  initialRequest?: ScriptRequest | null;
}

export default function ProductForm({ onSubmit, isLoading, readOnly = false, initialRequest }: ProductFormProps) {
  const [formData, setFormData] = useState<ScriptRequest>({
    product_name: '',
    specifications: '',
    image_url: '',
    scene_count: 3,
    ad_tone: 'energetic',
    gemini_model: 'gemini-3-flash-preview',
  });
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Sample products loaded from API
  const [samples, setSamples] = useState<SampleProduct[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(true);

  // Image input tabs
  const [imageTab, setImageTab] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageInputLoading, setImageInputLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  const visibleCount = 3;
  const maxOffset = Math.max(0, samples.length - visibleCount);

  // Populate form from initialRequest (resume flow)
  useEffect(() => {
    if (initialRequest) {
      setFormData(initialRequest);
      if (initialRequest.image_url) {
        setImagePreview(initialRequest.image_url);
      }
    }
  }, [initialRequest]);

  // Load samples on mount
  useEffect(() => {
    listSamples()
      .then((res) => setSamples(res.samples))
      .catch(() => setSamples([]))
      .finally(() => setSamplesLoading(false));
  }, []);

  const handleChange =
    (field: keyof ScriptRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      setSelectedSample(null);
    };

  const handleSelectSample = (sample: SampleProduct) => {
    setFormData((prev) => ({
      ...prev,
      product_name: sample.product_name,
      specifications: sample.specifications,
      image_url: sample.image_url,
    }));
    setSelectedSample(sample.id);
    setImagePreview(sample.thumbnail);
    setImageError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  // Image upload handler
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError('File exceeds 10MB limit');
      return;
    }

    setImageInputLoading(true);
    setImageError(null);
    // Show local preview immediately
    setImagePreview(URL.createObjectURL(file));

    try {
      const res = await uploadImage(file);
      setFormData((prev) => ({ ...prev, image_url: res.image_url }));
      setImagePreview(res.image_url);
      setSelectedSample(null);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Upload failed');
      setImagePreview(null);
    } finally {
      setImageInputLoading(false);
    }
  }, []);

  // Drag-and-drop handlers
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // AI image generation
  const handleGenerateImage = async () => {
    if (!generatePrompt.trim()) return;
    setImageInputLoading(true);
    setImageError(null);
    setImagePreview(null);

    try {
      const res = await generateProductImage(generatePrompt);
      setFormData((prev) => ({ ...prev, image_url: res.image_url }));
      setImagePreview(res.image_url);
      setSelectedSample(null);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setImageInputLoading(false);
    }
  };

  // Auto-fill from image
  const handleAutoFill = async () => {
    if (!formData.image_url) return;
    setAutoFillLoading(true);
    try {
      const res = await analyzeImage(formData.image_url);
      setFormData((prev) => ({
        ...prev,
        product_name: res.product_name,
        specifications: res.specifications,
      }));
    } catch {
      // Silently fail — user can still fill in manually
    } finally {
      setAutoFillLoading(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 1200, mx: 'auto', borderTop: '4px solid', borderTopColor: 'primary.main' }}>
      <CardContent sx={{ p: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Create Video Campaign
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select a sample product or configure your own to start generating a cinematic ad.
          </Typography>
        </Box>

        <Grid container spacing={5}>
          {/* Left Column: Media & Samples */}
          <Grid size={{ xs: 12, md: 7 }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Inventory2 sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              Sample Products
            </Typography>
            <Chip
              label="AI-Generated Images"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {samplesLoading ? '...' : `${samples.length} products`}
            </Typography>
          </Box>
          {samplesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setScrollOffset((o) => Math.max(0, o - 1))}
                  disabled={scrollOffset === 0}
              >
                <ChevronLeft />
              </IconButton>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flex: 1,
                  overflow: 'hidden',
                }}
              >
                {samples.slice(scrollOffset, scrollOffset + visibleCount).map((sample) => (
                  <Card
                    key={sample.id}
                    variant="outlined"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      border: selectedSample === sample.id ? '2px solid' : '1px solid',
                      borderColor:
                        selectedSample === sample.id ? 'primary.main' : 'divider',
                      transition: 'all 0.15s',
                      animation: 'fadeInUp 0.4s ease',
                    }}
                  >
                    <CardActionArea
                      onClick={() => !readOnly && handleSelectSample(sample)}
                      disabled={isLoading || readOnly}
                    >
                      <CardMedia
                        component="img"
                        height={120}
                        image={sample.thumbnail}
                        alt={sample.product_name}
                        sx={{
                          objectFit: 'cover',
                          bgcolor: 'grey.100',
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                        }}
                      />
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            lineHeight: 1.3,
                          }}
                        >
                          {sample.product_name}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
              <IconButton
                size="small"
                onClick={() => setScrollOffset((o) => Math.min(maxOffset, o + 1))}
                  disabled={scrollOffset >= maxOffset}
              >
                <ChevronRight />
              </IconButton>
            </Box>
          )}
        </Box>

        {/* Scene count — ToggleButtonGroup */}
        <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Tooltip title="Number of scenes in the ad. Each scene is ~8 seconds. More scenes = longer video." placement="top" arrow>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, cursor: 'help' }}>
              Scene Count
            </Typography>
          </Tooltip>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
                {[2, 3, 4, 5, 6].map((n) => {
                  const isSelected = formData.scene_count === n;
                  return (
                    <Chip
                      key={n}
                      label={n}
                      onClick={() => {
                        if (!readOnly) setFormData((prev) => ({ ...prev, scene_count: n }));
                      }}
                      disabled={isLoading || readOnly}
                      variant={isSelected ? 'filled' : 'outlined'}
                      color={isSelected ? 'primary' : 'default'}
                      sx={{
                        px: 1,
                        fontWeight: isSelected ? 600 : 500,
                        minWidth: 48,
                      }}
                    />
                  );
                })}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            ~{(formData.scene_count ?? 3) * 8}s total
          </Typography>
        </Box>

        {/* Image input section with tabs */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Product Image
          </Typography>
          <Tabs
            value={imageTab}
            onChange={(_, v) => {
              setImageTab(v);
              setImageError(null);
            }}
            sx={{ mb: 2, minHeight: 36 }}
          >
            <Tab
              icon={<LinkIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="URL"
              sx={{ minHeight: 36, py: 0, textTransform: 'none' }}
            />
            <Tab
              icon={<CloudUpload sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="Upload"
              sx={{ minHeight: 36, py: 0, textTransform: 'none' }}
            />
            <Tab
              icon={<AutoAwesome sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="AI Generate"
              sx={{ minHeight: 36, py: 0, textTransform: 'none' }}
            />
          </Tabs>

          {imageError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setImageError(null)}>
              {imageError}
            </Alert>
          )}

          {/* Tab 0: URL */}
          {imageTab === 0 && (
            <TextField
              label="Product Image URL"
              value={formData.image_url}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, image_url: e.target.value }));
                setImagePreview(e.target.value || null);
                setSelectedSample(null);
              }}
              fullWidth
              disabled={isLoading || readOnly}
              placeholder="https://example.com/product.png"
              helperText={
                selectedSample
                  ? 'Using sample product image'
                  : 'Enter a publicly accessible image URL'
              }
            />
          )}

          {/* Tab 1: Upload */}
          {imageTab === 1 && (
            <Box
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => !readOnly && fileInputRef.current?.click()}
                  className="file-drop-zone"
                  sx={{
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                disabled={readOnly}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {imageInputLoading ? (
                <CircularProgress size={24} />
              ) : (
                      <Box sx={{ py: 3 }}>
                        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.8 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Drag & drop your product image
                        </Typography>
                  <Typography variant="body2" color="text.secondary">
                          or click to browse local files
                  </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
                          Max 10MB — High resolution PNG, JPG, or WebP recommended
                  </Typography>
                      </Box>
              )}
            </Box>
          )}

          {/* Tab 2: AI Generate */}
          {imageTab === 2 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Describe the product"
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                fullWidth
                disabled={isLoading || imageInputLoading || readOnly}
                placeholder="e.g. red wireless earbuds with charging case"
              />
              <Button
                variant="contained"
                onClick={handleGenerateImage}
                disabled={isLoading || imageInputLoading || !generatePrompt.trim() || readOnly}
                startIcon={
                  imageInputLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <ImageIcon />
                  )
                }
                sx={{ minWidth: 120, textTransform: 'none' }}
              >
                Generate
              </Button>
            </Box>
          )}

          {/* Image preview + auto-fill */}
          {imagePreview && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box
                component="img"
                src={imagePreview}
                alt="Product preview"
                sx={{
                  width: 120,
                  height: 120,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleAutoFill}
                disabled={isLoading || autoFillLoading || !formData.image_url || readOnly}
                startIcon={
                  autoFillLoading ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <AutoFixHigh />
                  )
                }
                sx={{ textTransform: 'none', mt: 1 }}
              >
                Auto-fill with AI
              </Button>
            </Box>
          )}
        </Box>
          </Grid>

          {/* Right Column: Details & Settings */}
          <Grid size={{ xs: 12, md: 5 }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}
        >
              <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, backgroundColor: 'background.paper', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                  Product Details
                </Typography>
          <TextField
            label="Product Name"
            value={formData.product_name}
            onChange={handleChange('product_name')}
            fullWidth
            required
            disabled={isLoading || readOnly}
          />

          <TextField
            label="Specifications"
            value={formData.specifications}
            onChange={handleChange('specifications')}
            fullWidth
            required
            multiline
            rows={6}
            disabled={isLoading || readOnly}
          />
              </Paper>

              <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, backgroundColor: 'background.paper', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                  Generation Settings
                </Typography>

          {/* Generation settings */}
          <Box>
            <Tooltip title="Overall mood of the ad — affects dialogue style, music direction, and visual tone." placement="top" arrow>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, cursor: 'help' }}>
                Ad Tone
              </Typography>
            </Tooltip>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {AD_TONES.map((tone) => {
                      const isSelected = formData.ad_tone === tone;
                      return (
                        <Chip
                          key={tone}
                          label={tone}
                          onClick={() => {
                            if (!readOnly) setFormData((prev) => ({ ...prev, ad_tone: tone }));
                          }}
                          disabled={isLoading || readOnly}
                          variant={isSelected ? 'filled' : 'outlined'}
                          color={isSelected ? 'primary' : 'default'}
                          sx={{
                            textTransform: 'capitalize',
                            fontWeight: isSelected ? 600 : 500,
                            px: 0.5,
                            transition: 'all 0.2s',
                          }}
                        />
                      );
                    })}
                  </Box>
          </Box>

          <Box sx={{ maxWidth: 320 }}>
            <Tooltip title="AI model for script generation. Pro = highest quality. Flash = faster generation." placement="top" arrow>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                Gemini Model
              </Typography>
            </Tooltip>
            <FormControl size="small" fullWidth>
              <Select
                value={formData.gemini_model ?? 'gemini-3-flash-preview'}
                onChange={(e: SelectChangeEvent) =>
                  setFormData((prev) => ({ ...prev, gemini_model: e.target.value }))
                }
                disabled={isLoading || readOnly}
              >
                {GEMINI_MODELS.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.label} — {model.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ maxWidth: 320 }}>
            <Tooltip title="Maximum spoken words per scene. Keep low for punchier delivery — Veo renders dialogue literally." placement="top" arrow>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, cursor: 'help' }}>
                Max Dialogue Words / Scene: {formData.max_dialogue_words_per_scene ?? 15}
              </Typography>
            </Tooltip>
            <Slider
              value={formData.max_dialogue_words_per_scene ?? 15}
              onChange={(_, value) =>
                setFormData((prev) => ({
                  ...prev,
                  max_dialogue_words_per_scene: value as number,
                }))
              }
              min={10}
              max={50}
              step={5}
              marks
              valueLabelDisplay="auto"
              disabled={isLoading || readOnly}
            />
          </Box>

          <Box>
            <Tooltip title="Additional creative direction appended to the AI prompt. Use for brand guidelines, audience targeting, or style preferences." placement="top" arrow>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                Custom Instructions (optional)
              </Typography>
            </Tooltip>
            <TextField
              value={formData.custom_instructions || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, custom_instructions: e.target.value }))
              }
              fullWidth
              multiline
              rows={3}
              disabled={isLoading || readOnly}
              placeholder="e.g. Focus on sustainability features, use humor, target Gen-Z audience..."
            />
          </Box>
              </Paper>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={
              isLoading || !formData.product_name || !formData.image_url || readOnly
            }
            startIcon={
              isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <AutoAwesome />
              )
            }
                sx={{ py: 2, fontSize: '1.1rem', mt: 2, boxShadow: '0 8px 24px rgba(26,115,232,0.25)' }}
          >
            {isLoading ? 'Generating Script...' : 'Generate Script'}
          </Button>
        </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
