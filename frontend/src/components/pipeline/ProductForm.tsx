import { useState } from 'react';
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
  Divider,
  Chip,
} from '@mui/material';
import { AutoAwesome, Inventory2 } from '@mui/icons-material';
import type { ScriptRequest } from '../../types';

interface ProductFormProps {
  onSubmit: (request: ScriptRequest) => Promise<void>;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Sample products with pre-generated images (via Nano Banana Pro)
// ---------------------------------------------------------------------------
interface SampleProduct extends ScriptRequest {
  id: string;
  thumbnail: string;
}

const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    id: 'running_shoes',
    product_name: 'AeroGlide Pro Running Shoes',
    specifications: `Weight: 215g (men's size 10)
Drop: 8mm (heel-to-toe)
Midsole: ZoomX foam with carbon fiber plate
Upper: Engineered mesh with Flyknit collar
Outsole: Rubber waffle pattern for road + light trail
Colors: Volt/Black, Arctic Blue/White, Sunset Orange
Key Features: Energy return, responsive cushioning, breathable fit
Price: $179.99`,
    image_url: 'http://localhost:8000/output/samples/running_shoes.png',
    thumbnail: '/output/samples/running_shoes.png',
  },
  {
    id: 'espresso_machine',
    product_name: 'BrewMaster S1 Espresso Machine',
    specifications: `Pressure: 15-bar Italian pump
Boiler: Thermoblock heating, ready in 25 seconds
Water Tank: 1.5L removable
Grinder: Built-in conical burr, 15 settings
Milk System: Automatic steam wand with latte art capability
Display: 2.8" color touchscreen
Dimensions: 11" x 14" x 15"
Finish: Brushed stainless steel with matte black accents
Key Features: PID temperature control, pre-infusion, auto-clean
Price: $549.99`,
    image_url: 'http://localhost:8000/output/samples/espresso_machine.png',
    thumbnail: '/output/samples/espresso_machine.png',
  },
  {
    id: 'headphones',
    product_name: 'SoundWave ANC Pro Headphones',
    specifications: `Driver: 40mm custom dynamic drivers
Frequency Response: 4Hz - 40kHz
ANC: Adaptive hybrid active noise cancellation
Battery: 60 hours (ANC on), 80 hours (ANC off)
Charging: USB-C, 5-min charge = 4 hours playback
Connectivity: Bluetooth 5.4, multipoint (3 devices)
Codec Support: LDAC, aptX Adaptive, AAC
Weight: 254g
Key Features: Spatial audio, transparency mode, AI call noise reduction
Price: $349.99`,
    image_url: 'http://localhost:8000/output/samples/headphones.png',
    thumbnail: '/output/samples/headphones.png',
  },
];

export default function ProductForm({ onSubmit, isLoading }: ProductFormProps) {
  const [formData, setFormData] = useState<ScriptRequest>({
    product_name: '',
    specifications: '',
    image_url: '',
  });
  const [selectedSample, setSelectedSample] = useState<string | null>(null);

  const handleChange =
    (field: keyof ScriptRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      setSelectedSample(null); // clear sample selection when editing
    };

  const handleSelectSample = (sample: SampleProduct) => {
    setFormData({
      product_name: sample.product_name,
      specifications: sample.specifications,
      image_url: sample.image_url,
    });
    setSelectedSample(sample.id);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          Create Video Campaign
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select a sample product or enter your own details below.
        </Typography>

        {/* Sample product cards */}
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
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {SAMPLE_PRODUCTS.map((sample) => (
              <Card
                key={sample.id}
                variant="outlined"
                sx={{
                  flex: 1,
                  border:
                    selectedSample === sample.id
                      ? '2px solid'
                      : '1px solid',
                  borderColor:
                    selectedSample === sample.id
                      ? 'primary.main'
                      : 'divider',
                  transition: 'all 0.15s',
                }}
              >
                <CardActionArea
                  onClick={() => handleSelectSample(sample)}
                  disabled={isLoading}
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
                      // If image fails, show a colored placeholder
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
        </Box>

        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary">
            or enter details manually
          </Typography>
        </Divider>

        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <TextField
            label="Product Name"
            value={formData.product_name}
            onChange={handleChange('product_name')}
            fullWidth
            required
            disabled={isLoading}
          />

          <TextField
            label="Product Image URL"
            value={formData.image_url}
            onChange={handleChange('image_url')}
            fullWidth
            required
            disabled={isLoading}
            helperText={
              selectedSample
                ? 'Using sample product image'
                : 'Enter a publicly accessible image URL'
            }
          />

          <TextField
            label="Specifications"
            value={formData.specifications}
            onChange={handleChange('specifications')}
            fullWidth
            required
            multiline
            rows={6}
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={
              isLoading || !formData.product_name || !formData.image_url
            }
            startIcon={
              isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <AutoAwesome />
              )
            }
            sx={{ py: 1.5, fontSize: '1rem' }}
          >
            {isLoading ? 'Generating...' : 'Generate Campaign'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
