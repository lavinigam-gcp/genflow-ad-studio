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
  Slider,
  Collapse,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
} from '@mui/material';
import {
  AutoAwesome,
  Inventory2,
  ExpandMore,
  ExpandLess,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
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
  {
    id: 'smartwatch',
    product_name: 'PulseTrack Ultra Smartwatch',
    specifications: `Display: 1.45" AMOLED, 466x466, 2000 nits peak brightness
Case: Grade 5 titanium, 46mm diameter
Sensors: Optical heart rate, SpO2, skin temperature, ECG
Navigation: Dual-band GPS + GLONASS + Galileo
Battery: 7-day typical use, 48hr GPS continuous
Water Resistance: 10ATM (100m)
Connectivity: Bluetooth 5.3, Wi-Fi, NFC payments
OS: Wear OS 5 with custom fitness suite
Key Features: Sleep coaching, body composition, offline maps
Price: $399.99`,
    image_url: 'http://localhost:8000/output/samples/smartwatch.png',
    thumbnail: '/output/samples/smartwatch.png',
  },
  {
    id: 'skincare_serum',
    product_name: 'GlowLab Vitamin C Serum',
    specifications: `Active Ingredients: 20% L-Ascorbic Acid, 1% Hyaluronic Acid, 0.5% Vitamin E
Volume: 30ml / 1.0 fl oz
Packaging: Amber glass dropper bottle with matte gold cap
pH: 3.2 (optimal for L-AA absorption)
Texture: Lightweight, fast-absorbing water-based serum
Skin Types: All skin types, dermatologist tested
Key Features: Brightening, anti-aging, antioxidant protection, dark spot correction
Certifications: Cruelty-free, vegan, fragrance-free
Price: $68.00`,
    image_url: 'http://localhost:8000/output/samples/skincare_serum.png',
    thumbnail: '/output/samples/skincare_serum.png',
  },
  {
    id: 'electric_scooter',
    product_name: 'UrbanGlide X1 Electric Scooter',
    specifications: `Motor: 350W brushless hub motor (700W peak)
Top Speed: 25 mph (40 km/h)
Range: 30 miles (48 km) per charge
Battery: 48V 15Ah lithium-ion, 4hr full charge
Tires: 10" pneumatic, puncture-resistant
Brakes: Dual disc brakes + regenerative braking
Weight: 36 lbs (16.3 kg), foldable design
Max Load: 265 lbs (120 kg)
Key Features: LED headlight/taillight, app connectivity, cruise control
Price: $799.99`,
    image_url: 'http://localhost:8000/output/samples/electric_scooter.png',
    thumbnail: '/output/samples/electric_scooter.png',
  },
  {
    id: 'wireless_earbuds',
    product_name: 'BassCore Elite Earbuds',
    specifications: `Drivers: 10mm custom dynamic drivers with titanium diaphragm
ANC: Hybrid active noise cancellation, -35dB reduction
Battery: 8hr earbuds + 32hr charging case (40hr total)
Charging: USB-C, Qi wireless charging
Water Resistance: IPX5 (sweat and rain proof)
Connectivity: Bluetooth 5.4, multipoint (2 devices)
Codec Support: LDAC, AAC, SBC
Weight: 5.2g per earbud, 48g case
Key Features: Spatial audio, transparency mode, in-ear detection
Price: $129.99`,
    image_url: 'http://localhost:8000/output/samples/wireless_earbuds.png',
    thumbnail: '/output/samples/wireless_earbuds.png',
  },
  {
    id: 'yoga_mat',
    product_name: 'ZenGrip Pro Yoga Mat',
    specifications: `Thickness: 6mm (1/4 inch)
Material: Natural tree rubber base, polyurethane top layer
Dimensions: 72" x 26" (183 x 66 cm)
Weight: 5.5 lbs (2.5 kg)
Surface: Non-slip wet and dry grip, moisture-absorbing
Alignment: Laser-etched alignment markers
Certifications: OEKO-TEX Standard 100, biodegradable
Includes: Cotton carry strap
Key Features: Eco-friendly, antimicrobial, superior cushioning
Price: $89.99`,
    image_url: 'http://localhost:8000/output/samples/yoga_mat.png',
    thumbnail: '/output/samples/yoga_mat.png',
  },
  {
    id: 'portable_blender',
    product_name: 'BlendJet PowerFresh Blender',
    specifications: `Motor: 300W high-torque motor
Capacity: 20oz (590ml) BPA-free Tritan jar
Blades: 6-point stainless steel, ice-crushing capable
Battery: 4000mAh USB-C rechargeable, 15+ blends per charge
Speed: One-touch operation, 30-second blend cycle
Dimensions: 3.5" x 10.5" (9 x 27 cm)
Weight: 1.3 lbs (590g)
Safety: Auto-lock when open, magnetic charging base
Key Features: Self-cleaning mode, leak-proof lid, dishwasher-safe jar
Price: $49.99`,
    image_url: 'http://localhost:8000/output/samples/portable_blender.png',
    thumbnail: '/output/samples/portable_blender.png',
  },
];

const AD_TONES = ['energetic', 'sophisticated', 'playful', 'authoritative', 'warm'];

const SCENE_COUNT_MARKS = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
];

export default function ProductForm({ onSubmit, isLoading }: ProductFormProps) {
  const [formData, setFormData] = useState<ScriptRequest>({
    product_name: '',
    specifications: '',
    image_url: '',
    scene_count: 3,
    target_duration: 30,
    ad_tone: 'energetic',
  });
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  const visibleCount = 3;
  const maxOffset = Math.max(0, SAMPLE_PRODUCTS.length - visibleCount);

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

        {/* Sample product carousel */}
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
              {SAMPLE_PRODUCTS.length} products
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => setScrollOffset((o) => Math.max(0, o - 1))}
              disabled={scrollOffset === 0 || isLoading}
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
              {SAMPLE_PRODUCTS.slice(scrollOffset, scrollOffset + visibleCount).map(
                (sample) => (
                  <Card
                    key={sample.id}
                    variant="outlined"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      border:
                        selectedSample === sample.id ? '2px solid' : '1px solid',
                      borderColor:
                        selectedSample === sample.id ? 'primary.main' : 'divider',
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
                ),
              )}
            </Box>
            <IconButton
              size="small"
              onClick={() => setScrollOffset((o) => Math.min(maxOffset, o + 1))}
              disabled={scrollOffset >= maxOffset || isLoading}
            >
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>

        {/* Scene count slider */}
        <Box sx={{ mb: 3, px: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Scene Count
          </Typography>
          <Slider
            value={formData.scene_count ?? 3}
            onChange={(_, value) =>
              setFormData((prev) => ({ ...prev, scene_count: value as number }))
            }
            min={2}
            max={6}
            step={1}
            marks={SCENE_COUNT_MARKS}
            valueLabelDisplay="auto"
            disabled={isLoading}
            sx={{ maxWidth: 400 }}
          />
        </Box>

        {/* Advanced options */}
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            onClick={() => setShowAdvanced((v) => !v)}
            endIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Advanced Options
          </Button>
          <Collapse in={showAdvanced}>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2.5, pl: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Target Duration: {formData.target_duration ?? 30}s
                </Typography>
                <Slider
                  value={formData.target_duration ?? 30}
                  onChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      target_duration: value as number,
                    }))
                  }
                  min={15}
                  max={60}
                  step={5}
                  marks={[
                    { value: 15, label: '15s' },
                    { value: 30, label: '30s' },
                    { value: 45, label: '45s' },
                    { value: 60, label: '60s' },
                  ]}
                  valueLabelDisplay="auto"
                  disabled={isLoading}
                  sx={{ maxWidth: 400 }}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Ad Tone
                </Typography>
                <ToggleButtonGroup
                  value={formData.ad_tone ?? 'energetic'}
                  exclusive
                  onChange={(_, value) => {
                    if (value) setFormData((prev) => ({ ...prev, ad_tone: value }));
                  }}
                  size="small"
                  disabled={isLoading}
                >
                  {AD_TONES.map((tone) => (
                    <ToggleButton
                      key={tone}
                      value={tone}
                      sx={{ textTransform: 'capitalize', px: 2 }}
                    >
                      {tone}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            </Box>
          </Collapse>
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
