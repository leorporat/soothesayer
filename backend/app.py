from flask import Flask, request, jsonify
from flask_cors import CORS
from groq_inference import get_text_from_image_front_camera, get_text_from_image_back_camera, get_text_from_audio, analyze_combined_results
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Create uploads folder
os.makedirs('uploads', exist_ok=True)

# Create audio uploads folder specifically for mobile app
os.makedirs('uploads/audio', exist_ok=True)



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
    
    result = get_text_from_image_front_camera(filepath)
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
    
    result = get_text_from_image_back_camera(filepath)
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
    
    transcription = get_text_from_audio(filepath)
    os.remove(filepath)
    
    return jsonify({
        'success': True,
        'transcription': transcription
    })

@app.route('/api/analyze/combined-sentiment', methods=['POST'])
def analyze_combined_sentiment():
    # Check if all required files are present
    if 'face_image' not in request.files:
        return jsonify({'error': 'No face image file'}), 400
    if 'environment_image' not in request.files:
        return jsonify({'error': 'No environment image file'}), 400
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file'}), 400
    
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
    face_result = get_text_from_image_front_camera(face_filepath)
    env_result = get_text_from_image_back_camera(env_filepath)
    audio_transcription = get_text_from_audio(audio_filepath)
    
    # Clean up files
    os.remove(face_filepath)
    os.remove(env_filepath)
    os.remove(audio_filepath)
    
    # Analyze the combined results
    analysis = analyze_combined_results(
        face_result.content, 
        env_result.content, 
        audio_transcription
    )
    
    # Return combined results with analysis
    return jsonify({
        'success': True,
        'raw_data': {
            'face_sentiment': face_result.content,
            'environment_analysis': env_result.content,
            'audio_transcription': audio_transcription
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
        
        # Create unique filename with timestamp
        timestamp_str = datetime.fromtimestamp(int(timestamp) / 1000).strftime('%Y%m%d_%H%M%S')
        filename = f"mobile_audio_{timestamp_str}_{audio_file.filename}"
        filepath = f"uploads/audio/{filename}"
        
        # Save the file
        audio_file.save(filepath)
        
        # Process the audio file (transcribe it)
        try:
            transcription = get_text_from_audio(filepath)
            print(f"Audio transcribed successfully: {filename}")
        except Exception as e:
            print(f"Error transcribing audio {filename}: {str(e)}")
            transcription = "Error transcribing audio"
        
        # You can add additional processing here:
        # - Convert to different format
        # - Analyze audio sentiment
        # - Store in database
        # - Send to external services
        
        # For now, we'll keep the file and return success
        # You might want to delete it after processing depending on your needs
        
        return jsonify({
            'success': True,
            'message': 'Audio file received and processed successfully',
            'filename': filename,
            'timestamp': timestamp,
            'duration': duration,
            'transcription': transcription,
            'file_size': os.path.getsize(filepath)
        })
        
    except Exception as e:
        print(f"Error processing audio upload: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)