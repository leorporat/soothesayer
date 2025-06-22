from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
#from groq_inference import get_text_from_image_front_camera, get_text_from_image_back_camera, get_text_from_audio, analyze_combined_results
from SoothSayer import SoothSayer
import os
from datetime import datetime
import shutil
from dotenv import load_dotenv
from collections import defaultdict
import time

import asyncio
from lmnt.api import Speech
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('soothsayer.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Simple rate limiting
request_counts = defaultdict(list)
RATE_LIMIT_REQUESTS = 20  # Max requests per minute
RATE_LIMIT_WINDOW = 60  # 60 seconds

def is_rate_limited(ip_address: str) -> bool:
    """Simple rate limiting based on IP address"""
    now = time.time()
    
    # Clean old requests outside the window
    request_counts[ip_address] = [
        req_time for req_time in request_counts[ip_address] 
        if now - req_time < RATE_LIMIT_WINDOW
    ]
    
    # Check if rate limit exceeded
    if len(request_counts[ip_address]) >= RATE_LIMIT_REQUESTS:
        logger.warning(f"🚫 [RATE-LIMIT] IP {ip_address} exceeded rate limit: {len(request_counts[ip_address])}/{RATE_LIMIT_REQUESTS} requests in {RATE_LIMIT_WINDOW}s")
        return True
    
    # Add current request
    request_counts[ip_address].append(now)
    logger.info(f"📊 [RATE-LIMIT] IP {ip_address}: {len(request_counts[ip_address])}/{RATE_LIMIT_REQUESTS} requests in window")
    return False

@app.before_request
def before_request():
    """Check rate limiting before processing request"""
    ip = request.remote_addr or 'unknown'
    
    # Skip rate limiting for health check only
    if request.endpoint == 'health_check':
        return
    
    if is_rate_limited(ip):
        return jsonify({
            'error': 'Rate limit exceeded',
            'message': f'Maximum {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds allowed'
        }), 429

# Create uploads folder
os.makedirs('uploads', exist_ok=True)

# SoothSayer init
client = SoothSayer(os.environ["GROQ_API_KEY"], "MiDaS_small")

async def main(text: str):
    logger.info(f"🔊 [TTS-LEGACY] Starting LMNT synthesis for text: '{text[:50]}...'")
    try:
        async with Speech(api_key='ak_GkxGopYg9FwhJaQkJ9huMC') as speech:
            logger.info(f"🔊 [TTS-LEGACY] LMNT client initialized")
            synthesis = await speech.synthesize(text, 'leah')
            logger.info(f"🔊 [TTS-LEGACY] Synthesis completed, audio size: {len(synthesis['audio'])} bytes")
        
        with open('hello.mp3', 'wb') as f:
            f.write(synthesis['audio'])
            logger.info(f"🔊 [TTS-LEGACY] Audio saved to hello.mp3")
    except Exception as e:
        logger.error(f"❌ [TTS-LEGACY] Error in legacy TTS: {str(e)}")

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

@app.route('/api/analyze/face-sentiment', methods=['POST'])
def analyze_face_sentiment():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file'}), 400
    
    file = request.files['image']
    filepath = f"uploads/{file.filename}"
    file.save(filepath)
    
    result = client.get_text_from_image_front_camera(filepath)
    os.remove(filepath)
    
    return jsonify({
        'success': True,
        'sentiment': result.content
    })

@app.route('/api/analyze/environment-sentiment', methods=['POST'])
def analyze_environment_sentiment():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file'}), 400
    
    file = request.files['image']
    filepath = f"uploads/{file.filename}"
    file.save(filepath)
    
    result = client.get_text_from_image_back_camera(filepath)
    os.remove(filepath)
    
    return jsonify({
        'success': True,
        'environment': result.content
    })

@app.route('/api/analyze/audio-transcription', methods=['POST'])
def analyze_audio_transcription():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file'}), 400
    
    file = request.files['audio']
    filepath = f"uploads/{file.filename}"
    file.save(filepath)
    
    transcription = client.get_text_from_audio(filepath)
    os.remove(filepath)
    
    return jsonify({
        'success': True,
        'transcription': transcription
    })

@app.route('/api/analyze/combined-sentiment', methods=['POST'])
def analyze_combined_sentiment():
    logger.info("🔮 [COMBINED-ANALYSIS] Starting combined sentiment analysis")
    
    # Check if all required files are present
    required = ['face_image', 'environment_image', 'audio']
    for req in required:
        if req not in request.files:
            logger.warning(f"❌ [COMBINED-ANALYSIS] Missing required file: {req}")
            return jsonify({'error': f'No {req} file'}), 400
    
    logger.info("🔮 [COMBINED-ANALYSIS] All required files present")
    
    # Save all files temporarily
    face_file = request.files['face_image']
    face_filepath = f"uploads/{face_file.filename}"
    face_file.save(face_filepath)
    logger.info(f"🔮 [COMBINED-ANALYSIS] Face image saved: {face_filepath}")
    
    env_file = request.files['environment_image']
    env_filepath = f"uploads/{env_file.filename}"
    env_file.save(env_filepath)
    logger.info(f"🔮 [COMBINED-ANALYSIS] Environment image saved: {env_filepath}")
    
    audio_file = request.files['audio']
    audio_filepath = f"uploads/{audio_file.filename}"
    audio_file.save(audio_filepath)
    logger.info(f"🔮 [COMBINED-ANALYSIS] Audio file saved: {audio_filepath}")
    
    # Get all analyses
    logger.info("🔮 [COMBINED-ANALYSIS] Starting SoothSayer comprehensive analysis...")
    analysis = client.input_to_audio(face_filepath, env_filepath, audio_filepath)
    
    logger.info("🔮 [COMBINED-ANALYSIS] Running legacy TTS generation...")
    text_for_tts = str(analysis) if analysis else "analysis complete"
    asyncio.run(main(text_for_tts))
    
    # Clean up files
    os.remove(face_filepath)
    os.remove(env_filepath)
    os.remove(audio_filepath)
    logger.info("🔮 [COMBINED-ANALYSIS] Cleanup completed")
    
    logger.info("🔮 [COMBINED-ANALYSIS] ✅ Combined analysis completed successfully")
    
    # Return combined results with analysis
    return jsonify({
        'success': True,
        # 'raw_data': {
        #     'face_sentiment': face_result.content,
        #     'environment_analysis': env_result.content,
        #     'audio_transcription': audio_transcription
        # },
        'analysis': analysis
    })

@app.route('/api/audio/upload', methods=['POST'])
def upload_audio():
    """
    Endpoint to receive m4a audio files from React Native app
    """
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Validate file
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file type (should be m4a)
        if not audio_file.filename or not audio_file.filename.lower().endswith('.m4a'):
            return jsonify({'error': 'Invalid file type. Only m4a files are allowed'}), 400
        
        # Get metadata from form data
        timestamp = request.form.get('timestamp', str(int(datetime.now().timestamp() * 1000)))
        duration = request.form.get('duration', '10')
        
        # Create consistent filename for the most recent audio
        # This makes it easy for other functions to always access the latest audio
        latest_filename = "latest_audio.m4a"
        latest_filepath = f"uploads/audio/{latest_filename}"
        
        # Also create a timestamped backup for archival purposes
        timestamp_str = datetime.fromtimestamp(int(timestamp) / 1000).strftime('%Y%m%d_%H%M%S')
        backup_filename = f"audio_backup_{timestamp_str}.m4a"
        backup_filepath = f"uploads/audio/{backup_filename}"
        
        # Save the file with both names
        audio_file.save(latest_filepath)
        
        # Create a copy for backup
        shutil.copy2(latest_filepath, backup_filepath)
        
        # Process the audio file (transcribe it)
        try:
            transcription = client.get_text_from_audio(latest_filepath)
            print(f"Audio transcribed successfully: {latest_filename}")
        except Exception as e:
            print(f"Error transcribing audio {latest_filename}: {str(e)}")
            transcription = "Error transcribing audio"
        
        # You can add additional processing here:
        # - Convert to different format
        # - Analyze audio sentiment
        # - Store in database
        # - Send to external services
        
        return jsonify({
            'success': True,
            'message': 'Audio file received and processed successfully',
            'latest_filename': latest_filename,
            'backup_filename': backup_filename,
            'timestamp': timestamp,
            'duration': duration,
            'transcription': transcription,
            'file_size': os.path.getsize(latest_filepath)
        })
        
    except Exception as e:
        print(f"Error processing audio upload: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def get_latest_audio_path():
    """Get the path to the latest audio file"""
    audio_dir = "uploads/audio"
    if not os.path.exists(audio_dir):
        return None
    
    latest_file = os.path.join(audio_dir, "latest_audio.m4a")
    if os.path.exists(latest_file):
        return latest_file
    return None

@app.route('/api/audio/latest', methods=['GET'])
def get_latest_audio():
    """
    Endpoint to get the most recent audio file and its transcription
    """
    try:
        latest_path = get_latest_audio_path()
        
        if not latest_path:
            return jsonify({'error': 'No audio file found'}), 404
        
        # Get file info
        file_size = os.path.getsize(latest_path)
        file_modified = datetime.fromtimestamp(os.path.getmtime(latest_path))
        
        # Get transcription
        try:
            transcription = client.get_text_from_audio(latest_path)
        except Exception as e:
            print(f"Error transcribing latest audio: {str(e)}")
            transcription = "Error transcribing audio"
        
        return jsonify({
            'success': True,
            'filename': 'latest_audio.m4a',
            'file_path': latest_path,
            'file_size': file_size,
            'last_modified': file_modified.isoformat(),
            'transcription': transcription
        })
        
    except Exception as e:
        print(f"Error getting latest audio: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

async def generate_audio_response(text: str, output_filename: str | None = None):
    """Generate audio response using LMNT from text"""
    logger.info(f"🔊 [TTS] Starting audio generation for text: '{text[:100]}...'")
    
    if output_filename is None:
        output_filename = f"response_{int(datetime.now().timestamp())}.mp3"
    
    output_path = f"uploads/audio/{output_filename}"
    logger.info(f"🔊 [TTS] Output path: {output_path}")
    
    try:
        logger.info(f"🔊 [TTS] Initializing LMNT Speech client...")
        async with Speech(api_key=os.environ.get("LMNT_API_KEY", "ak_GkxGopYg9FwhJaQkJ9huMC")) as speech:
            logger.info(f"🔊 [TTS] LMNT client connected, starting synthesis with voice 'leah'")
            synthesis = await speech.synthesize(text, 'leah')
            logger.info(f"🔊 [TTS] ✅ Synthesis successful! Audio size: {len(synthesis['audio'])} bytes")
        
        # Ensure the audio directory exists
        os.makedirs('uploads/audio', exist_ok=True)
        logger.info(f"🔊 [TTS] Audio directory ensured: uploads/audio/")
        
        with open(output_path, 'wb') as f:
            f.write(synthesis['audio'])
            logger.info(f"🔊 [TTS] ✅ Audio file saved successfully: {output_filename}")
        
        # Verify file was created
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            logger.info(f"🔊 [TTS] ✅ File verification: {output_filename} ({file_size} bytes)")
        else:
            logger.error(f"❌ [TTS] File verification failed: {output_filename} not found")
        
        return output_path
        
    except Exception as e:
        logger.error(f"❌ [TTS] Audio generation failed: {str(e)}")
        raise e

def generate_conversational_response(transcription: str) -> str:
    """Generate a conversational response to user's audio input"""
    logger.info(f"🤖 [GROQ] Generating response for transcription: '{transcription[:100]}...'")
    
    try:
        logger.info(f"🤖 [GROQ] Calling GROQ chat completion API...")
        chat_completion = client.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are SoothSayer, a helpful AI companion. Respond conversationally to the user's message. Keep responses under 30 words and be supportive and insightful."
                },
                {
                    "role": "user", 
                    "content": transcription
                }
            ],
            model="llama-3.3-70b-versatile"
        )
        content = chat_completion.choices[0].message.content
        response_text = content if content else "I'm having trouble understanding right now. Please try again."
        
        logger.info(f"🤖 [GROQ] ✅ Response generated: '{response_text}'")
        return response_text
        
    except Exception as e:
        logger.error(f"❌ [GROQ] Response generation failed: {str(e)}")
        return "I'm having trouble understanding right now. Please try again."

@app.route('/api/audio/conversation', methods=['POST'])
async def audio_conversation():
    """
    Complete conversational flow: Audio → Transcription → GROQ Response → LMNT Speech → Audio File
    """
    logger.info("🎯 [CONVERSATION] Starting new audio conversation session")
    
    try:
        if 'audio' not in request.files:
            logger.warning("❌ [CONVERSATION] No audio file provided in request")
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        logger.info(f"🎯 [CONVERSATION] Received audio file: {audio_file.filename}")
        
        if not audio_file.filename or not audio_file.filename.lower().endswith('.m4a'):
            logger.warning(f"❌ [CONVERSATION] Invalid file type: {audio_file.filename}")
            return jsonify({'error': 'Invalid file type. Only m4a files are allowed'}), 400
        
        # Save uploaded audio
        timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        input_filename = f"input_{timestamp_str}.m4a"
        input_filepath = f"uploads/audio/{input_filename}"
        
        os.makedirs('uploads/audio', exist_ok=True)
        audio_file.save(input_filepath)
        logger.info(f"🎯 [CONVERSATION] Audio saved to: {input_filepath}")
        
        # Step 1: Transcribe the audio
        logger.info("🎤 [CONVERSATION-STEP-1] Starting audio transcription...")
        try:
            transcription = client.get_text_from_audio(input_filepath)
            if not transcription:
                logger.error("❌ [CONVERSATION-STEP-1] Empty transcription received")
                return jsonify({'error': 'No transcription available'}), 500
            logger.info(f"🎤 [CONVERSATION-STEP-1] ✅ Transcribed: '{transcription}'")
            print(f"🎤 Transcribed: {transcription}")
        except Exception as e:
            logger.error(f"❌ [CONVERSATION-STEP-1] Transcription failed: {str(e)}")
            print(f"Error transcribing audio: {str(e)}")
            return jsonify({'error': 'Failed to transcribe audio'}), 500
        
        # Step 2: Generate conversational response
        logger.info("🤖 [CONVERSATION-STEP-2] Generating conversational response...")
        response_text = generate_conversational_response(transcription)
        if not response_text:
            response_text = "I'm sorry, I couldn't generate a response."
        logger.info(f"🤖 [CONVERSATION-STEP-2] ✅ Response: '{response_text}'")
        print(f"🤖 Response: {response_text}")
        
        # Step 3: Convert response to audio using LMNT
        logger.info("🔊 [CONVERSATION-STEP-3] Converting response to audio...")
        try:
            response_filename = f"response_{timestamp_str}.mp3"
            response_filepath = await generate_audio_response(response_text, response_filename)
            logger.info(f"🔊 [CONVERSATION-STEP-3] ✅ Audio generated: {response_filepath}")
            print(f"🔊 Audio generated: {response_filepath}")
        except Exception as e:
            logger.error(f"❌ [CONVERSATION-STEP-3] Audio generation failed: {str(e)}")
            print(f"Error generating audio response: {str(e)}")
            return jsonify({'error': 'Failed to generate audio response'}), 500
        
        # Clean up input file
        try:
            os.remove(input_filepath)
            logger.info(f"🧹 [CONVERSATION] Cleaned up input file: {input_filename}")
        except:
            logger.warning(f"⚠️ [CONVERSATION] Failed to clean up input file: {input_filename}")
            pass
        
        logger.info("🎯 [CONVERSATION] ✅ Session completed successfully")
        
        return jsonify({
            'success': True,
            'transcription': transcription,
            'response_text': response_text,
            'response_audio_file': response_filename,
            'response_audio_path': response_filepath
        })
        
    except Exception as e:
        logger.error(f"❌ [CONVERSATION] Session failed: {str(e)}")
        print(f"Error in audio conversation: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/audio/download/<filename>')
def download_audio(filename):
    """Download generated audio files"""
    try:
        file_path = os.path.join('uploads/audio', filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)