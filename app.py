# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# Author: sjangbahadur@

import os
import json
import re
import io
import time
import tempfile
import requests
from flask import Flask, request, jsonify, render_template
from google import genai
from google.genai import types
from google.cloud import storage
from flask_cors import CORS

# --- Configuration ---
PROJECT_ID = os.getenv("PROJECT_ID")
REGION = os.getenv("REGION")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
VEO_MODEL_ID = os.getenv("VEO_MODEL_ID")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")
IMAGE_MODEL = os.getenv("IMAGE_MODEL")

template_dir = os.path.abspath('./')
# --- Initialize Clients ---
app = Flask(__name__,template_folder=template_dir)
CORS(app)

# Initialize GenAI Client
client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=REGION,
)

# Initialize Storage Client
storage_client = storage.Client(project=PROJECT_ID)
bucket = storage_client.bucket(GCS_BUCKET_NAME)

# --- Helper Functions ---

def clean_json_response(response_text):
    """Cleans Markdown formatting from JSON string."""
    print(response_text)
    response_text_temp = re.sub(r"json", "", response_text)
    response_text_temp = re.sub(r"```", "", response_text_temp)
    return json.loads(response_text_temp)

def upload_bytes_to_gcs(image_bytes, destination_blob_name, content_type="image/*"):
    """Uploads bytes directly to GCS."""
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_string(image_bytes, content_type=content_type)
    return f"gs://{GCS_BUCKET_NAME}/{destination_blob_name}"

def upload_file_to_gcs(source_file_name, destination_blob_name):
    """Uploads a local file to GCS."""
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_filename(source_file_name)
    return f"gs://{GCS_BUCKET_NAME}/{destination_blob_name}", f"https://storage.mtls.cloud.google.com/{GCS_BUCKET_NAME}/{destination_blob_name}"

def download_image_as_bytes(url):
    """Downloads an image from a URL."""
    response = requests.get(url, stream=True)
    response.raise_for_status()
    return io.BytesIO(response.content).getvalue()

def get_bytes_from_gcs(gcs_uri):
    """Reads a file from GCS and returns bytes."""
    # format: gs://bucket/path
    blob_name = gcs_uri.replace(f"gs://{GCS_BUCKET_NAME}/", "")
    blob = bucket.blob(blob_name)
    return blob.download_as_bytes()

# --- Core AI Functions (Refactored) ---

def _generate_script_logic(product_name, specs, product_image_bytes):
    msg1_text1 = types.Part.from_text(text=f"""SYSTEM:```You are an award-winning Advertising Director and Creative Copywriter specializing in high-conversion short-form video content.
      Your expertise lies in creating 30-second commercials that utilize realistic AI avatars to build trust and explain complex products simply.
      Your goal is to take a product name, its specifications, and a product image URL, and transform them into a structured JSON payload that serves as a programmatic blueprint for video generation.
      You prioritize realism, clarity, and engagement.```
      INSTRUCTION:```Based on the provided {product_name}, {specs}, and product image given below, generate a detailed 30+ second video production script in strict JSON format.
      The video must be broken down into sequential scenes (approx 5-6 scenes, totaling 30+ seconds).
      Constraints:
      1. JSON Only: Do not include conversational text outside the JSON object.
      2. Timing: The sum of all `duration_seconds` must equal 30.
      3. Logic: Ensure smooth transitions between scenes.
      4. Image Usage: You must explicitly describe how the provided product image is visually integrated into every scene.
      5. Scripting: Translate technical {specs} into user-centric benefits.```
      Product_image:""")
    msg1_text2 = types.Part.from_text(text="""Output Format:```Return a single JSON object with the following structure:
      {
         "video_title": "string",
         "total_duration": 30,
         "avatar_profile": {
           "gender": "string",
           "age_range": "string",
           "attire": "string (professional yet approachable)",
           "tone_of_voice": "string",
           "visual_description": "Detailed physical description of the avatar to ensure consistency across scenes. Make background white color."
          },
          "scenes": [
            {
            "scene_number": 1,
            "duration_seconds": 8,
            "scene_type": "e.g., The Hook, The Problem, The Solution",
            "visual_background": "Detailed description of the environment.",
            "avatar_action": "Specific gestures or movements.",
            "product_visual_integration": "How the product_image_url is displayed (e.g., 'Holographic overlay next to avatar', 'Picture-in-Picture top right', 'Avatar holding a tablet displaying the image').",
            "script_dialogue": "The crisp exact spoken words which fits within max 8 sec."
            }
          ]
        }```""")
    
    image_part = types.Part.from_bytes(data=product_image_bytes, mime_type="image/*")
    
    contents = [
        types.Content(
          role="user",
          parts=[
            msg1_text1,
            image_part,
            msg1_text2
          ]
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
    )

    response = client.models.generate_content(
        model = GEMINI_MODEL,
        contents = contents,
        config = generate_content_config,
    )
    return clean_json_response(response.text)

def _generate_image_logic(prompt, output_path, avatar_uri=None, product_uri=None):
    parts = []
    if avatar_uri:
        av_bytes = get_bytes_from_gcs(avatar_uri)
        parts.append(types.Part.from_bytes(data=av_bytes, mime_type="image/png"))
    
    if product_uri:
        prod_bytes = get_bytes_from_gcs(product_uri)
        parts.append(types.Part.from_bytes(data=prod_bytes, mime_type="image/jpeg"))
    parts.append(types.Part.from_text(text=prompt))

    contents = [
        types.Content(
        role="user",
        parts=parts
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        temperature = 1,
        top_p = 0.95,
        max_output_tokens = 32768,
        response_modalities = ["IMAGE"],
        safety_settings = [types.SafetySetting(
        category="HARM_CATEGORY_HATE_SPEECH",
        threshold="OFF"
        ),types.SafetySetting(
        category="HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold="OFF"
        ),types.SafetySetting(
        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold="OFF"
        ),types.SafetySetting(
        category="HARM_CATEGORY_HARASSMENT",
        threshold="OFF"
        )],
        image_config=types.ImageConfig(
        aspect_ratio="9:16",
        image_size="1K",
        output_mime_type="image/png",
        ),
    )

    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=contents,
        config=generate_content_config
    )
    
    # Save first candidate to temp file
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            with open(output_path, 'wb') as f:
                f.write(part.inline_data.data)
            return True
    return False

def _qc_storyboard_logic(avatar_uri, product_uri, storyboard_uri):
    # Retrieve bytes for QC
    msg1_text1 = types.Part.from_text(text="""SYSTEM:```You are an expert Ad Video Director and Visual Continuity Specialist with a keen eye for detail. Your role is to perform rigorous quality assurance on video storyboards to ensure strict consistency with brand assets. 
        You have an exceptional ability to detect subtle discrepancies in facial features, clothing details, product packaging, logos, and color grading. You evaluate visual inputs objectively and provide structured, data-driven feedback in JSON format. 
        Your goal is to ensure that the character (avatar) and the merchandise (product) in the storyboard are identical to their respective references.```
        INSTRUCTION:```Analyze the provided input images:
        (1) Reference Avatar
        (2) Reference Product and
        (3) Storyboard Image.
        Perform a comparative analysis to validate the visual consistency.
        ### STEPS:
        1. Avatar Analysis:
            - Compare the character in the Storyboard Image against the Reference Avatar.
            - Scrutinize facial features, hair style/color, age, gender, ethnicity, and clothing style.
            - Determine if the identity is preserved or if there are hallucinations/distortions.
        2. Product Analysis:
            - Compare the object/product in the Storyboard Image against the Reference Product.
            - Check for logo accuracy, spelling of text, color codes, shape, and packaging details.
            - Ensure the product has not been morphed or replaced.
        3. Scoring & Reasoning:
            - Assign a consistency score from 0 to 100 for both the Avatar and the Product (where 100 is a pixel-perfect conceptual match and 0 is completely unrecognizable).
            - Provide a concise, specific reason for the score, highlighting exactly what matched or what failed (e.g., 'Face shape matches, but eye color is wrong' or 'Logo text is misspelled').```
        REFERENCE_AVATAR_IMAGE:""")

    msg1_text2 = types.Part.from_text(text="""OUTPUT_FORMAT:
        You must return ONLY a raw JSON object with no markdown formatting or additional text. Use the following schema:
        ```{
            "avatar_validation": {
                "score": <integer_0_to_100>,
                "reason": "<detailed_explanation_string>"
            },
            "product_validation": {
                "score": <integer_0_to_100>,
                "reason": "<detailed_explanation_string>"
            }
        }```""")
    print("Analyze image.....")
    print(avatar_uri)
    print(product_uri)
    print(storyboard_uri)
    avatar_bytes = get_bytes_from_gcs(avatar_uri)
    product_bytes = get_bytes_from_gcs(product_uri)
    storyboard_bytes = get_bytes_from_gcs(storyboard_uri)

    contents = [
        types.Content(
          role="user",
          parts=[
            msg1_text1,
            types.Part.from_bytes(data=avatar_bytes, mime_type="image/*"), 
            types.Part.from_text(text="""REFERENCE_PRODUCT_IMAGE:"""),
            types.Part.from_bytes(data=product_bytes, mime_type="image/*"),
            types.Part.from_text(text="""STORYBOARD_IMAGE:"""),
            types.Part.from_bytes(data=storyboard_bytes, mime_type="image/*"),
            msg1_text2
          ]
        ),
    ]
    tools = []

    generate_content_config = types.GenerateContentConfig(
        temperature = 1,
        top_p = 0.95,
        max_output_tokens = 65535,
        safety_settings = [types.SafetySetting(
          category="HARM_CATEGORY_HATE_SPEECH",
          threshold="OFF"
        ),types.SafetySetting(
          category="HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold="OFF"
        ),types.SafetySetting(
          category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold="OFF"
        ),types.SafetySetting(
          category="HARM_CATEGORY_HARASSMENT",
          threshold="OFF"
        )],
        tools = tools,
        thinking_config=types.ThinkingConfig(
          thinking_level="HIGH",
        ),
      )
    print("AI call to analyze image.....")
    response = client.models.generate_content(
        model = GEMINI_MODEL,
        contents = contents,
        config = generate_content_config,
    )
    return clean_json_response(response.text)

def _generate_veo_video(prompt, reference_image_uri, output_gcs_uri):
    # Optional parameters
    negative_prompt = "ugly, low quality"
    aspect_ratio = "9:16"
    resolution = "1080p"
    generate_audio = True
    duration_seconds = 8
    number_of_videos = 1

    if reference_image_uri:
        operation = client.models.generate_videos(
            model=VEO_MODEL_ID,
            prompt=prompt,
            image=types.Image(
                gcs_uri=reference_image_uri,
                mime_type="image/png",
            ),
            config=types.GenerateVideosConfig(
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                number_of_videos=number_of_videos,
                duration_seconds=duration_seconds,
                negative_prompt=negative_prompt,
                generate_audio=generate_audio,
                output_gcs_uri=output_gcs_uri,
            ),
        )
    else:
        operation = client.models.generate_videos(
            model=VEO_MODEL_ID,
            prompt=prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                number_of_videos=number_of_videos,
                duration_seconds=duration_seconds,
                negative_prompt=negative_prompt,
                generate_audio=generate_audio,
                output_gcs_uri=output_gcs_uri,
            ),
        )

    while not operation.done:
        time.sleep(15)
        operation = client.operations.get(operation)
        print(operation)

    if operation.response:
        print(operation.result.generated_videos[0].video.uri)
        return operation.result.generated_videos[0].video.uri
    else:
        return None

def _qc_video_logic(video_uri, reference_image_uri):
    msg1_text1 = types.Part.from_text(text="""SYSTEM:```You are a veteran Film Director and VFX Quality Control Supervisor with over 20 years of experience in cinematic workflows and post-production. You possess an acute eye for detail, capable of spotting sub-pixel anomalies, temporal inconsistencies, and fidelity issues. 
        Your task is to critique AI-generated or edited video content against reference asset with a rigorous standard for photorealism, continuity, and technical integrity. You communicate using technical cinematic terminology.```
        INSTRUCTION:```Analyze the provided video input in relation to the provided reference Image''. You must conduct a frame-by-frame analysis to detect any degradation in quality or logical fallacies.
        Evaluate the video based on the following five specific dimensions:
        1. Technical Distortion: Check for compression artifacts, screen tearing, aliasing, warping, or glitching.
        2. Cinematic Imperfections: Analyze lighting flickers, unnatural motion blur, grain inconsistencies, or color grading shifts that break the cinematic look.
        3. Avatar Consistency: Compare the video subject against the reference Image. Check for facial feature consistency, and anatomical correctness during movement.
        4. Product Consistency: Compare the object in the video against the Reference Image. Check for logo deformation, texture warping, scale issues, or color shifting.
        Scoring Criteria:
        - Provide a 'Quality Score' from 0 to 10 for each category (10 being perfect/flawless, 0 being unusable).
        Make sure to double check the reference image and video frames before generating the results.```
        VIDEO:""")
    msg1_video1 = types.Part.from_uri(
        file_uri=video_uri,
        mime_type="video/mp4",
        media_resolution={"level": "media_resolution_high"}
    )
    msg1_image1 = types.Part.from_uri(
        file_uri=reference_image_uri,
        mime_type="image/png",
        media_resolution={"level": "media_resolution_high"}
    )
    msg1_text2 = types.Part.from_text(text="""Output Format:```
        - Your response must be strictly in valid JSON format.
        - Do not include markdown formatting (like ```json) or conversational text outside the JSON object.
        - Use the following schema:
        {
            "analysis_report": {
                "technical_distortion": {
                    "score": <0-10>,
                    "reasoning": "Detailed technical explanation of artifacts observed..."
                },
                "cinematic_imperfections": {
                    "score": <0-10>,
                    "reasoning": "Analysis of lighting, shutter angle, camera movements and grain..."
                },
                "avatar_consistency": {
                    "score": <0-10>,
                    "reasoning": "Comparison of facial feature consistency against reference..."
                },
                "product_consistency": {
                    "score": <0-10>,
                    "reasoning": "Assessment of brand asset fidelity and object geometry..."
                },
                "overall_verdict": "A summary statement regarding the video's usability for professional broadcast."
            }
        }```""")

    contents = [
        types.Content(
            role="user",
            parts=[
                msg1_text1,
                msg1_video1,
                types.Part.from_text(text="""REFERENCE_IMAGE:"""),
                msg1_image1,
                msg1_text2
            ]
        ),
    ]
    tools = []

    generate_content_config = types.GenerateContentConfig(
        temperature = 1,
        top_p = 0.95,
        max_output_tokens = 65535,
        safety_settings = [types.SafetySetting(
            category="HARM_CATEGORY_HATE_SPEECH",
            threshold="OFF"
        ),types.SafetySetting(
            category="HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold="OFF"
        ),types.SafetySetting(
            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold="OFF"
        ),types.SafetySetting(
            category="HARM_CATEGORY_HARASSMENT",
            threshold="OFF"
        )],
        tools = tools,
        thinking_config=types.ThinkingConfig(
            thinking_level="HIGH",
        ),
    )
    response = client.models.generate_content(
        model = GEMINI_MODEL,
        contents = contents,
        config = generate_content_config,
    )
    return clean_json_response(response.text)

# --- API Endpoints ---

@app.route('/')
def home():
    """Serves the frontend HTML."""
    return render_template('index.html')

@app.route('/generate-script', methods=['POST'])
def generate_script():
    """
    1. Generate Script
    Input: { "product_name": str, "specifications": str, "image_url": str }
    """
    try:
        data = request.json
        product_name = data.get('product_name')
        specs = data.get('specifications')
        image_url = data.get('image_url')
        run_id = str(int(time.time()))

        # Download Image
        image_bytes = download_image_as_bytes(image_url)
        filename = image_url.split("/")[-1]
        
        # Upload Product Image to GCS for later steps
        product_gcs_path = f"demo_workflow/{run_id}/{filename}"
        product_gcs_uri = upload_bytes_to_gcs(image_bytes, product_gcs_path, "image/*")

        # Generate Script
        script_json = _generate_script_logic(product_name, specs, image_bytes)
        
        return jsonify({
            "status": "success",
            "run_id": run_id,
            "product_gcs_uri": product_gcs_uri,
            "script": script_json
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/generate-avatar', methods=['POST'])
def generate_avatar():
    """
    2. Generate Avatar
    Input: { "run_id": str, "avatar_profile": dict }
    """
    try:
        data = request.json
        run_id = data.get('run_id')
        avatar_profile = data.get('avatar_profile')
        
        # Create prompt from profile
        avatar_prompt = f"Professional studio photo. {json.dumps(avatar_profile)} White background."
        
        with tempfile.NamedTemporaryFile(suffix=".png") as temp_file:
            success = _generate_image_logic(avatar_prompt, temp_file.name)
            
            if success:
                gcs_dest = f"demo_workflow/{run_id}/avatar.png"
                avatar_gcs_uri, web_uri = upload_file_to_gcs(temp_file.name, gcs_dest)
                
                return jsonify({
                    "status": "success",
                    "avatar_gcs_uri": avatar_gcs_uri,
                    "web_uri": web_uri
                })
            else:
                return jsonify({"status": "error", "message": "Failed to generate avatar image"}), 500

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/generate-storyboard', methods=['POST'])
def generate_storyboard():
    """
    3. Generate Storyboard and QC
    Input: { "run_id": str, "scenes": list, "avatar_gcs_uri": str, "product_gcs_uri": str }
    """
    try:
        data = request.json
        run_id = data.get('run_id')
        scenes = data.get('scenes')
        avatar_uri = data.get('avatar_gcs_uri')
        product_uri = data.get('product_gcs_uri')
        
        results = []

        for scene in scenes:
            scene_num = scene['scene_number']
            prompt = f"Background: {scene['visual_background']}, Action: {scene['avatar_action']}, Product Integration: {scene['product_visual_integration']}"
            
            with tempfile.NamedTemporaryFile(suffix=".png") as temp_file:
                # Generate Scene Image
                _generate_image_logic(prompt, temp_file.name, avatar_uri, product_uri)
                
                # Upload Scene Image
                gcs_dest = f"demo_workflow/{run_id}/scene_{scene_num}.png"
                scene_gcs_uri, scene_web_uri = upload_file_to_gcs(temp_file.name, gcs_dest)
                
                # QC Check
                qc_result = _qc_storyboard_logic(avatar_uri, product_uri, scene_gcs_uri)
                
                results.append({
                    "scene_number": scene_num,
                    "scene_gcs_uri": scene_gcs_uri,
                    "scene_web_uri": scene_web_uri,
                    "qc_report": qc_result
                })

        return jsonify({
            "status": "success",
            "storyboard_results": results
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/generate-video', methods=['POST'])
def generate_video():
    """
    4. Generate Video and QC
    Input: { "run_id": str, "scenes_data": list (output of storyboard step), "script_scenes": list (original script) }
    """
    try:
        data = request.json
        run_id = data.get('run_id')
        scenes_data = data.get('storyboard_results') # Result from previous step
        script_scenes = data.get('script_scenes')    # Original script data for dialogue/prompts
        avatar_profile = data.get('avatar_profile')
        
        video_results = []
        
        # Map script details to storyboard images by scene number
        script_map = {s['scene_number']: s for s in script_scenes}

        for scene_img_data in scenes_data:
            scene_num = scene_img_data['scene_number']
            script_detail = script_map.get(scene_num)
            
            if not script_detail:
                continue

            # Construct Video Prompt
            # video_prompt = (f"Cinematic shot. {script_detail['visual_background']}. "
            #                f"{script_detail['avatar_action']}. "
            #                f"Product: {script_detail['product_visual_integration']}.")
            video_prompt = f"""scene_type: {script_detail['scene_type']}, tone_of_voice: {avatar_profile['tone_of_voice']}, 
                avatar_action : {script_detail['avatar_action']}, visual_background: {script_detail['visual_background']},
                 product_visual_integration: {script_detail['product_visual_integration']}, Dialogue:{script_detail['script_dialogue']}"""
            
            # Generate Video
            veo_output_folder = f"gs://{GCS_BUCKET_NAME}/demo_workflow/{run_id}/videos/"
            generated_video_uri = _generate_veo_video(video_prompt, scene_img_data['scene_gcs_uri'], veo_output_folder)
            
            if generated_video_uri:
                # Video QC
                qc_verdict = _qc_video_logic(generated_video_uri, scene_img_data['scene_gcs_uri'])
                
                video_results.append({
                    "scene_number": scene_num,
                    "video_uri": generated_video_uri,
                    "qc_report": qc_verdict
                })

        return jsonify({
            "status": "success",
            "video_results": video_results
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
