"""Prompt templates for the GenMedia video production pipeline.

All prompt constants are defined here for centralized management.
Templates use Python str.format() style placeholders.
"""

# ---------------------------------------------------------------------------
# Script generation
# ---------------------------------------------------------------------------

SCRIPT_SYSTEM_INSTRUCTION = (
    "You are an award-winning Advertising Director and Creative Copywriter "
    "specializing in high-conversion short-form video content for social media "
    "(Instagram Reels, YouTube Shorts, TikTok). You create 30-second commercials "
    "using realistic AI avatars. You think in terms of CAMERA SHOTS, LIGHTING, "
    "and EMOTIONAL ARCS. You ALWAYS output valid JSON with no additional text."
)

SCRIPT_USER_PROMPT_TEMPLATE = """\
Analyze the product image provided and create a cinematic 30-second video \
advertisement script for the following product.

PRODUCT: {product_name}
SPECIFICATIONS: {specs}

NARRATIVE ARC (6 scenes, ~30 seconds total):
1. The Hook (6s) - Grab attention immediately with a bold visual or question
2. The Problem (5s) - Show the pain point the audience relates to
3. The Reveal (6s) - Introduce the product as the solution with a dramatic reveal
4. The Proof (6s) - Demonstrate the key feature or benefit with specifics
5. The Lifestyle (4s) - Show the aspirational outcome of using the product
6. The CTA (3s) - Clear, urgent call to action

DIALOGUE RULES:
- Max 20-25 words per 8-second scene
- Conversational, punchy, direct-to-camera tone
- Use power words: "finally", "imagine", "discover", "unlock"
- End with a single clear CTA

Return ONLY this JSON structure:
{{
  "video_title": "Catchy title for the ad",
  "total_duration": 30,
  "avatar_profile": {{
    "gender": "male or female",
    "age_range": "e.g. 25-35",
    "attire": "Specific clothing description fitting the brand",
    "tone_of_voice": "e.g. Warm, energetic, authoritative",
    "visual_description": "Detailed physical appearance description"
  }},
  "scenes": [
    {{
      "scene_number": 1,
      "duration_seconds": 6,
      "scene_type": "The Hook",
      "shot_type": "Medium close-up",
      "camera_movement": "Slow dolly in",
      "lighting": "Warm golden hour lighting with soft fill",
      "visual_background": "Modern minimalist studio with soft bokeh",
      "avatar_action": "Looks directly into camera with a knowing smile, holds product",
      "avatar_emotion": "Intrigued, inviting",
      "product_visual_integration": "Product held at chest height, angled toward camera",
      "script_dialogue": "The dialogue the avatar speaks in this scene",
      "transition_to_next": "Quick zoom into product surface",
      "sound_design": "Subtle electronic pulse building anticipation"
    }}
  ]
}}

Create exactly 6 scenes following the narrative arc above. Make the script \
specific to the product shown in the image and described in the specifications.\
"""

# ---------------------------------------------------------------------------
# Avatar generation
# ---------------------------------------------------------------------------

AVATAR_PROMPT_TEMPLATE = """\
Photorealistic studio portrait photograph of a {gender} presenter, \
age {age_range}. {visual_description}. \
Wearing {attire}. \
Medium shot, head and shoulders visible. \
Shot on 85mm portrait lens, f/2.8, shallow depth of field. \
Professional 3-point studio lighting: key light at 45 degrees camera right, \
fill light camera left, hair light from above-behind. \
Pure white seamless backdrop. \
Warm, confident, approachable expression with direct eye contact. \
Natural skin texture, no retouching artifacts. \
NOT an illustration, NOT a cartoon, NOT a 3D render. \
Photorealistic only.\
"""

# ---------------------------------------------------------------------------
# Storyboard image generation
# ---------------------------------------------------------------------------

STORYBOARD_PROMPT_TEMPLATE = """\
Scene {scene_number} of {total_scenes} in a premium product commercial.

SHOT COMPOSITION:
- Shot type: {shot_type}
- Camera movement: {camera_movement} (captured as a still at peak moment)
- Background: {visual_background}
- Lighting: {lighting}

SUBJECT:
The person in this scene MUST be the EXACT same person as in the first \
reference image. Preserve their face shape, skin tone, eye color, hair \
color and style, and body proportions exactly. \
The presenter {avatar_action}. \
Their expression conveys: {avatar_emotion}.

PRODUCT:
The product MUST look identical to the second reference image. \
Preserve exact colors, logos, text, and proportions of the product. \
{product_visual_integration}.

STYLE:
Photorealistic, cinematic color grading, professional advertising photography, \
clean composition, 9:16 vertical format, broadcast quality.\
"""

# ---------------------------------------------------------------------------
# Video generation (Veo)
# ---------------------------------------------------------------------------

VIDEO_PROMPT_TEMPLATE = """\
A photorealistic commercial video scene. \
{shot_type} of a {gender} presenter ({age_range}, {visual_description}) \
in {visual_background}. \
The presenter {avatar_action}. \
Their tone is {tone_of_voice}, and their expression shows {avatar_emotion}. \
{product_visual_integration}. \
The presenter speaks: "{script_dialogue}". \
Camera: {camera_movement}. \
Lighting: {lighting}. \
Transition intent: {transition_to_next}. \
Sound design: {sound_design}. \
Style: High-end product commercial, broadcast quality, 4K cinematic look, \
natural motion, professional color grading.\
"""

VIDEO_NEGATIVE_PROMPT = (
    "ugly, low quality, blurry, pixelated, noisy, distorted face, "
    "deformed hands, extra fingers, mutated, disfigured, bad anatomy, "
    "watermark, text overlay, logo, cartoon, anime, illustration, "
    "3D render, uncanny valley, jerky motion, flickering, artifacts, "
    "overexposed, underexposed, dutch angle, shaky camera"
)

# ---------------------------------------------------------------------------
# Storyboard QC
# ---------------------------------------------------------------------------

STORYBOARD_QC_SYSTEM_INSTRUCTION = (
    "You are an expert visual continuity specialist and advertising QC director "
    "with 20 years of experience ensuring brand consistency across campaign "
    "assets. You evaluate generated storyboard frames against reference images "
    "for avatar fidelity, product accuracy, and compositional quality. "
    "You are precise, critical, and score conservatively. "
    "You ALWAYS output valid JSON with no additional text."
)

STORYBOARD_QC_USER_PROMPT = """\
You are given three images:
1. REFERENCE AVATAR - the approved avatar portrait
2. REFERENCE PRODUCT - the original product photograph
3. STORYBOARD FRAME - the generated storyboard image to evaluate

Evaluate the storyboard frame on these dimensions:

AVATAR VALIDATION (0-100):
- Face shape, skin tone, eye color match
- Hair color, style, and length match
- Overall likeness to the reference avatar
- Deduct heavily for different person, wrong gender, or cartoon appearance

PRODUCT VALIDATION (0-100):
- Product shape, color, and proportions match
- Logo and text accuracy
- Product placement naturalness
- Deduct heavily for wrong product, missing product, or distorted product

COMPOSITION QUALITY (0-100):
- Professional framing and rule-of-thirds
- Lighting quality and consistency
- Background appropriateness
- Overall advertising-ready quality

Return ONLY this JSON:
{{
  "avatar_validation": {{
    "score": <0-100>,
    "reason": "Brief explanation"
  }},
  "product_validation": {{
    "score": <0-100>,
    "reason": "Brief explanation"
  }},
  "composition_quality": {{
    "score": <0-100>,
    "reason": "Brief explanation"
  }}
}}\
"""

# ---------------------------------------------------------------------------
# Video QC
# ---------------------------------------------------------------------------

VIDEO_QC_SYSTEM_INSTRUCTION = (
    "You are a veteran film director and VFX QC supervisor with extensive "
    "experience evaluating AI-generated video content for broadcast-quality "
    "advertising. You assess technical quality, cinematic craft, avatar "
    "consistency, product accuracy, and temporal coherence. "
    "You score on a 0-10 scale where 7+ is acceptable for production use. "
    "You ALWAYS output valid JSON with no additional text."
)

VIDEO_QC_USER_PROMPT = """\
Evaluate this AI-generated video clip for a product commercial.

The first image is the reference product photo. The video follows.

Score each dimension 0-10 (where 7+ is production-ready):

1. TECHNICAL DISTORTION: Artifacts, glitches, resolution drops, \
encoding errors, frame drops
2. CINEMATIC IMPERFECTIONS: Camera stability, lighting consistency, \
color grading quality, composition
3. AVATAR CONSISTENCY: Face stability across frames, natural expressions, \
lip sync quality, body proportions
4. PRODUCT CONSISTENCY: Product appearance matches reference, no morphing \
or distortion, logo/text legibility
5. TEMPORAL COHERENCE: Smooth motion, no sudden jumps, consistent physics, \
natural transitions

Return ONLY this JSON:
{{
  "technical_distortion": {{
    "score": <0-10>,
    "reasoning": "Brief explanation"
  }},
  "cinematic_imperfections": {{
    "score": <0-10>,
    "reasoning": "Brief explanation"
  }},
  "avatar_consistency": {{
    "score": <0-10>,
    "reasoning": "Brief explanation"
  }},
  "product_consistency": {{
    "score": <0-10>,
    "reasoning": "Brief explanation"
  }},
  "temporal_coherence": {{
    "score": <0-10>,
    "reasoning": "Brief explanation"
  }},
  "overall_verdict": "PASS or FAIL with brief summary"
}}\
"""

# ---------------------------------------------------------------------------
# Prompt rewriting
# ---------------------------------------------------------------------------

PROMPT_REWRITE_TEMPLATE = """\
The following image generation prompt produced a result that failed quality \
control. Rewrite the prompt to fix the specific issues identified.

ORIGINAL PROMPT:
{original_prompt}

QC FEEDBACK:
{qc_feedback}

INSTRUCTIONS:
- Keep the same scene intent and composition
- Add more specific details to address each QC issue
- Strengthen identity-preservation language for the avatar if avatar score was low
- Strengthen product description language if product score was low
- Improve compositional direction if composition score was low
- Do NOT add JSON formatting — return only the improved prompt as plain text

IMPROVED PROMPT:\
"""
