from flask import Flask, request, jsonify
from flask_cors import CORS
#from groq_inference import get_text_from_image_front_camera, get_text_from_image_back_camera, get_text_from_audio, analyze_combined_results
from SoothSayer import SoothSayer
import os
from datetime import datetime
import shutil
from dotenv import load_dotenv
import time

import asyncio
from lmnt.api import Speech

app = Flask(__name__)
CORS(app)

# Create uploads folder
os.makedirs('uploads', exist_ok=True)

# SoothSayer init
client = SoothSayer(os.environ.get("GROQ_API_KEY"))

async def main(text: str):
    async with Speech(api_key='ak_GkxGopYg9FwhJaQkJ9huMC') as speech:
        synthesis = await speech.synthesize(text, 'leah')
    with open('hello.mp3', 'wb') as f:
        f.write(synthesis['audio'])

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
    
    # Initialize filepath variables
    face_filepath = None
    env_filepath = None
    audio_filepath = None
    
    # Check if this is a request to use latest files
    if request.content_type == 'application/json':
        data = request.get_json()
        use_latest_files = data.get('use_latest_files', False)
        
        if use_latest_files:
            logger.info("🔮 [COMBINED-ANALYSIS] Using latest files from uploads directory")
            
            # Get latest audio file
            latest_audio_path = get_latest_audio_path()
            if not latest_audio_path:
                logger.warning("❌ [COMBINED-ANALYSIS] No audio files found")
                return jsonify({'error': 'No audio files found'}), 404
            
            audio_filepath = latest_audio_path
            logger.info(f"🔮 [COMBINED-ANALYSIS] Latest audio file: {audio_filepath}")
            
            # Get latest photo files
            try:
                uploads_dir = "uploads"
                if not os.path.exists(uploads_dir):
                    logger.warning("❌ [COMBINED-ANALYSIS] Uploads directory not found")
                    return jsonify({'error': 'Uploads directory not found'}), 404
                
                # Get all photo files
                photo_files = [f for f in os.listdir(uploads_dir) if f.startswith('photo_') and f.endswith('.jpg')]
                
                if not photo_files:
                    logger.warning("❌ [COMBINED-ANALYSIS] No photo files found")
                    return jsonify({'error': 'No photo files found'}), 404
                
                # Sort by modification time (newest first)
                photo_files.sort(key=lambda x: os.path.getmtime(os.path.join(uploads_dir, x)), reverse=True)
                
                # Find the latest front and back camera photos
                latest_front = None
                latest_back = None
                
                for photo_file in photo_files:
                    if photo_file.startswith('photo_front_') and latest_front is None:
                        latest_front = photo_file
                    elif photo_file.startswith('photo_back_') and latest_back is None:
                        latest_back = photo_file
                    
                    # Stop if we found both
                    if latest_front and latest_back:
                        break
                
                if not latest_front or not latest_back:
                    logger.warning("❌ [COMBINED-ANALYSIS] Missing front or back camera photos")
                    return jsonify({'error': 'Missing front or back camera photos'}), 404
                
                face_filepath = os.path.join(uploads_dir, latest_front)
                env_filepath = os.path.join(uploads_dir, latest_back)
                
                logger.info(f"🔮 [COMBINED-ANALYSIS] Using latest files: Audio={audio_filepath}, Front={face_filepath}, Back={env_filepath}")
                
            except Exception as e:
                logger.error(f"❌ [COMBINED-ANALYSIS] Error getting latest photos: {str(e)}")
                return jsonify({'error': 'Error getting latest photos'}), 500
        else:
            return jsonify({'error': 'Invalid request format'}), 400
    else:
        # Original file upload approach
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

    # Verify all filepaths are set
    if not face_filepath or not env_filepath or not audio_filepath:
        logger.error("❌ [COMBINED-ANALYSIS] Missing file paths")
        return jsonify({'error': 'Missing file paths'}), 500

    # Get individual analyses with detailed logging
    logger.info("🔮 [COMBINED-ANALYSIS] Starting individual analyses...")
    
    # Face sentiment analysis
    logger.info("🔮 [COMBINED-ANALYSIS] Analyzing face sentiment...")
    face_analysis = client.get_text_from_image_front_camera(face_filepath)
    logger.info(f"🔮 [COMBINED-ANALYSIS] 😊 Face Analysis Result: {face_analysis.content}")
    
    # Environment analysis
    logger.info("🔮 [COMBINED-ANALYSIS] Analyzing environment...")
    env_analysis = client.get_text_from_image_back_camera(env_filepath)
    logger.info(f"🔮 [COMBINED-ANALYSIS] 🌍 Environment Analysis Result: {env_analysis.content}")
    
    # Audio transcription
    logger.info("🔮 [COMBINED-ANALYSIS] Transcribing audio...")
    audio_transcription = client.get_text_from_audio(audio_filepath)
    logger.info(f"🔮 [COMBINED-ANALYSIS] 📝 Audio Transcription Result: {audio_transcription}")
    
    raw_analysis = (face_analysis, env_analysis, audio_transcription)
    
    # Get comprehensive analysis
    logger.info("🔮 [COMBINED-ANALYSIS] Starting SoothSayer comprehensive analysis...")
    analysis = client.input_to_audio(face_filepath, env_filepath, audio_filepath)
    logger.info(f"🔮 [COMBINED-ANALYSIS] 🧠 SoothSayer Combined Analysis Result: {analysis}")
    
    logger.info("🔮 [COMBINED-ANALYSIS] Running legacy TTS generation...")
    text_for_tts = str(analysis) if analysis else "analysis complete"
    asyncio.run(main(text_for_tts))
    
    # Clean up files only if they were uploaded (not if using latest files)
    if request.content_type != 'application/json':
        os.remove(face_filepath)
        os.remove(env_filepath)
        os.remove(audio_filepath)
        logger.info("🔮 [COMBINED-ANALYSIS] Cleanup completed")
    
    logger.info("🔮 [COMBINED-ANALYSIS] ✅ Combined analysis completed successfully")
    
    # Return combined results with analysis
    return jsonify({
        'success': True,
        'raw_data': {
            'face_sentiment': face_analysis.content,
            'environment_analysis': env_analysis.content,
            'audio_transcription': audio_transcription
        },
        'analysis': analysis
    })

@app.route('/api/audio/upload', methods=['POST'])
def upload_audio():
    logger.info("🎤 [AUDIO-UPLOAD] Starting audio upload")
    
    if 'audio' not in request.files:
        logger.warning("❌ [AUDIO-UPLOAD] No audio file in request")
        return jsonify({'error': 'No audio file'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        logger.warning("❌ [AUDIO-UPLOAD] No selected file")
        return jsonify({'error': 'No selected file'}), 400
    
    # Generate unique filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"audio_{timestamp}.m4a"
    filepath = os.path.join('uploads', filename)
    
    try:
        file.save(filepath)
        file_size = os.path.getsize(filepath)
        logger.info(f"✅ [AUDIO-UPLOAD] Audio saved: {filepath} ({file_size} bytes)")
        
        # Get transcription
        transcription = client.get_text_from_audio(filepath)
        logger.info(f"📝 [AUDIO-UPLOAD] Transcription: {transcription[:100]}...")
        
        return jsonify({
            'success': True,
            'filename': filename,
            'file_size': file_size,
            'transcription': transcription,
            'latest_filename': filename
        })
        
    except Exception as e:
        logger.error(f"❌ [AUDIO-UPLOAD] Error processing audio: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/photo/upload', methods=['POST'])
def upload_photo():
    logger.info("📸 [PHOTO-UPLOAD] Starting photo upload")
    
    if 'photo' not in request.files:
        logger.warning("❌ [PHOTO-UPLOAD] No photo file in request")
        return jsonify({'error': 'No photo file'}), 400
    
    file = request.files['photo']
    if file.filename == '':
        logger.warning("❌ [PHOTO-UPLOAD] No selected file")
        return jsonify({'error': 'No selected file'}), 400
    
    # Get camera type from form data
    camera_type = request.form.get('camera_type', 'unknown')
    timestamp = request.form.get('timestamp', datetime.now().isoformat())
    
    # Generate unique filename with timestamp
    file_timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"photo_{camera_type}_{file_timestamp}.jpg"
    filepath = os.path.join('uploads', filename)
    
    try:
        file.save(filepath)
        file_size = os.path.getsize(filepath)
        logger.info(f"✅ [PHOTO-UPLOAD] Photo saved: {filepath} ({file_size} bytes)")
        logger.info(f"📸 [PHOTO-UPLOAD] Camera: {camera_type}, Timestamp: {timestamp}")
        
        return jsonify({
            'success': True,
            'filename': filename,
            'file_size': file_size,
            'camera_type': camera_type,
            'timestamp': timestamp,
            'latest_filename': filename
        })
        
    except Exception as e:
        logger.error(f"❌ [PHOTO-UPLOAD] Error processing photo: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/photo/latest', methods=['GET'])
def get_latest_photos():
    """
    Endpoint to get the most recent photo files (front and back camera)
    """
    try:
        uploads_dir = "uploads"
        if not os.path.exists(uploads_dir):
            return jsonify({'error': 'Uploads directory not found'}), 404
        
        # Get all photo files
        photo_files = [f for f in os.listdir(uploads_dir) if f.startswith('photo_') and f.endswith('.jpg')]
        
        if not photo_files:
            return jsonify({'error': 'No photo files found'}), 404
        
        # Sort by modification time (newest first)
        photo_files.sort(key=lambda x: os.path.getmtime(os.path.join(uploads_dir, x)), reverse=True)
        
        # Find the latest front and back camera photos
        latest_front = None
        latest_back = None
        
        for photo_file in photo_files:
            if photo_file.startswith('photo_front_') and latest_front is None:
                latest_front = photo_file
            elif photo_file.startswith('photo_back_') and latest_back is None:
                latest_back = photo_file
            
            # Stop if we found both
            if latest_front and latest_back:
                break
        
        result = {}
        
        if latest_front:
            front_path = os.path.join(uploads_dir, latest_front)
            result['front_filename'] = latest_front
            result['front_file_path'] = front_path
            result['front_file_size'] = os.path.getsize(front_path)
            result['front_last_modified'] = datetime.fromtimestamp(os.path.getmtime(front_path)).isoformat()
        
        if latest_back:
            back_path = os.path.join(uploads_dir, latest_back)
            result['back_filename'] = latest_back
            result['back_file_path'] = back_path
            result['back_file_size'] = os.path.getsize(back_path)
            result['back_last_modified'] = datetime.fromtimestamp(os.path.getmtime(back_path)).isoformat()
        
        result['success'] = True
        logger.info(f"📸 [PHOTO-LATEST] Retrieved latest photos: Front={latest_front}, Back={latest_back}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ [PHOTO-LATEST] Error getting latest photos: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def get_latest_audio_path():
    """Get the path to the latest audio file"""
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        return None
    
    # Get all audio files in uploads directory
    audio_files = [f for f in os.listdir(uploads_dir) if f.startswith('audio_') and f.endswith('.m4a')]
    
    if not audio_files:
        return None
    
    # Sort by modification time (newest first)
    audio_files.sort(key=lambda x: os.path.getmtime(os.path.join(uploads_dir, x)), reverse=True)
    
    # Return the most recent audio file
    latest_file = os.path.join(uploads_dir, audio_files[0])
    return latest_file

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)