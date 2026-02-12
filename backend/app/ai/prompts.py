"""Prompt templates for the GenMedia video production pipeline.

All prompt constants are defined here for centralized management.
Templates use Python str.format() style placeholders.
"""

# ---------------------------------------------------------------------------
# Script generation
# ---------------------------------------------------------------------------


def build_narrative_arc(scene_count: int, target_duration: int = 30) -> str:
    """Return a numbered narrative arc string sized to *scene_count*.

    Durations are computed as concrete second values so they sum to
    approximately *target_duration*.
    """
    # Each entry: (name, weight, description)
    if scene_count <= 2:
        # Hook + CTA
        arc = [
            ("The Hook", 0.70, "Grab attention immediately with a bold visual or question"),
            ("The CTA", 0.30, "Clear, urgent call to action"),
        ]
    elif scene_count == 3:
        # Hook + Reveal + CTA (default - fast ads)
        arc = [
            ("The Hook", 0.40, "Grab attention immediately with a bold visual or question"),
            ("The Reveal", 0.35, "Introduce the product as the solution with a dramatic reveal"),
            ("The CTA", 0.25, "Clear, urgent call to action"),
        ]
    elif scene_count == 4:
        # Hook + Problem + Reveal + CTA
        arc = [
            ("The Hook", 0.30, "Grab attention immediately with a bold visual or question"),
            ("The Problem", 0.25, "Show the pain point the audience relates to"),
            ("The Reveal", 0.25, "Introduce the product as the solution with a dramatic reveal"),
            ("The CTA", 0.20, "Clear, urgent call to action"),
        ]
    elif scene_count == 5:
        # Hook + Problem + Reveal + Proof + CTA
        arc = [
            ("The Hook", 0.25, "Grab attention immediately with a bold visual or question"),
            ("The Problem", 0.20, "Show the pain point the audience relates to"),
            ("The Reveal", 0.20, "Introduce the product as the solution with a dramatic reveal"),
            ("The Proof", 0.20, "Demonstrate the key feature or benefit with specifics"),
            ("The CTA", 0.15, "Clear, urgent call to action"),
        ]
    else:
        # 6 scenes - full arc
        arc = [
            ("The Hook", 0.20, "Grab attention immediately with a bold visual or question"),
            ("The Problem", 0.17, "Show the pain point the audience relates to"),
            ("The Reveal", 0.20, "Introduce the product as the solution with a dramatic reveal"),
            ("The Proof", 0.20, "Demonstrate the key feature or benefit with specifics"),
            ("The Lifestyle", 0.13, "Show the aspirational outcome of using the product"),
            ("The CTA", 0.10, "Clear, urgent call to action"),
        ]

    lines: list[str] = []
    for idx, (name, weight, description) in enumerate(arc, start=1):
        seconds = round(target_duration * weight)
        lines.append(f"{idx}. {name} ({seconds}s) - {description}")
    return "\n".join(lines)


SCRIPT_SYSTEM_INSTRUCTION = (
    "You are an award-winning Advertising Director and Creative Copywriter "
    "specializing in high-conversion short-form video content for social media "
    "(Instagram Reels, YouTube Shorts, TikTok). You create short commercials "
    "using realistic AI avatars. You think in terms of CAMERA SHOTS, LIGHTING, "
    "and EMOTIONAL ARCS. "
    "Each scene will be generated as an independent video clip. The ending frame "
    "of scene N must visually connect to the opening frame of scene N+1. "
    "You specify structured transition types (cut, dissolve, fade, wipe, zoom, "
    "match_cut, whip_pan) rather than free-text transitions. "
    "You provide audio_continuity descriptions to bridge audio between scenes. "
    "You ALWAYS output valid JSON with no additional text."
)

SCRIPT_USER_PROMPT_TEMPLATE = """\
Analyze the product image provided and create a cinematic {target_duration}-second \
video advertisement script for the following product.

PRODUCT: {product_name}
SPECIFICATIONS: {specs}

CREATIVE DIRECTION: {ad_tone}

NARRATIVE ARC ({scene_count} scenes, ~{target_duration} seconds total):
{narrative_arc}

DIALOGUE RULES:
- Max {max_words} words per scene
- Conversational, punchy, direct-to-camera tone
- Use power words: "finally", "imagine", "discover", "unlock"
- End with a single clear CTA

SCENE CONTINUITY RULES:
- The ending frame of scene N must visually match the opening frame of scene N+1.
- Maintain consistent color grading and lighting temperature across all scenes.
- When camera position changes between scenes, use match cuts or motivated \
transitions to preserve spatial logic.
- Ensure the avatar's wardrobe, hairstyle, and accessories remain identical \
throughout all scenes.

Return ONLY this JSON structure:
{{
  "video_title": "Catchy title for the ad",
  "total_duration": {target_duration},
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
      "transition_type": "dissolve",
      "transition_duration": 0.5,
      "audio_continuity": "Music pulse carries over into next scene; ambient tone stays warm",
      "sound_design": "Subtle electronic pulse building anticipation"
    }}
  ]
}}

Create exactly {scene_count} scenes following the narrative arc above. Make the \
script specific to the product shown in the image and described in the \
specifications.\
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
A photorealistic advertising photograph for scene {scene_number} of a \
{total_scenes}-scene premium product commercial. This is a {shot_type} \
captured at the peak moment of a {camera_movement}. The setting is \
{visual_background} with {lighting}.

The presenter — who MUST be the EXACT same person shown in the first \
reference image, preserving their face shape, skin tone, eye color, hair \
color and style, and body proportions exactly — {avatar_action}. \
Their expression conveys {avatar_emotion}.

The product shown in the second reference image MUST appear identical — \
preserve exact colors, logos, text, and proportions of the product. \
{product_visual_integration}.

Shot on professional cinema camera, 85mm portrait lens, 9:16 vertical \
format, cinematic color grading, shallow depth of field with subject \
and product in sharp focus, broadcast-quality advertising photography.\
"""

# ---------------------------------------------------------------------------
# Video generation (Veo)
# ---------------------------------------------------------------------------

VIDEO_PROMPT_TEMPLATE = """\
The subject {avatar_action}, their expression conveying {avatar_emotion}. \
{camera_movement}. {product_visual_integration}.

The subject speaks in a {tone_of_voice} voice, saying: {script_dialogue}

{sound_design}. \
Smooth, natural motion with broadcast-quality cinematography.\
"""

VIDEO_NEGATIVE_PROMPT = (
    "ugly, low quality, blurry, pixelated, noisy, distorted face, "
    "deformed hands, extra fingers, mutated, disfigured, bad anatomy, "
    "watermark, text overlay, text rendering, on-screen text, subtitles, "
    "logo, cartoon, anime, illustration, 3D render, uncanny valley, "
    "jerky motion, flickering, artifacts, overexposed, underexposed, "
    "dutch angle, shaky camera, lip sync mismatch, audio desync, "
    "multiple people, crowd, extra person"
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
