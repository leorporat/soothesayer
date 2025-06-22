from flask import Flask, request, jsonify
from flask_cors import CORS
#from groq_inference import get_text_from_image_front_camera, get_text_from_image_back_camera, get_text_from_audio, analyze_combined_results
from SoothSayer import SoothSayer
import os
from datetime import datetime
import shutil

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
    # Check if all required files are present
    required = ['face_image', 'environment_image', 'audio']
    for req in required:
        if req not in request.files:
            return jsonify({'error': f'No {req} file'}), 400
    
    # Save all files temporarily
    face_file = request.files['face_image']
    face_filepath = f"uploads/{face_file.filename}"
    face_file.save(face_filepath)
    
    env_file = request.files['environment_image']
    env_filepath = f"uploads/{env_file.filename}"
    env_file.save(env_filepath)
    
    audio_file = request.files['audio']
    audio_filepath = f"uploads/{audio_file.filename}"
    audio_file.save(audio_filepath)
    
    # Get all analyses
    raw_analysis = (
        client.get_text_from_image_front_camera(face_filepath),
        client.get_text_from_image_back_camera(env_filepath),
        client.get_text_from_audio(audio_filepath)
    )
    analysis = client.input_to_audio(face_filepath, env_filepath, audio_filepath)
    asyncio.run(main('analysis'))
    
    # Clean up files
    os.remove(face_filepath)
    os.remove(env_filepath)
    os.remove(audio_filepath)
    
    # Return combined results with analysis
    return jsonify({
        'success': True,
        'raw_data': {
            'face_sentiment': raw_analysis[0],
            'environment_analysis': raw_analysis[1],
            'audio_transcription': raw_analysis[2]
        },
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
        if not audio_file.filename.lower().endswith('.m4a'):
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