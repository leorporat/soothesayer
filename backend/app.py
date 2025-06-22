from flask import Flask, request, jsonify
from flask_cors import CORS
from groq_inference import get_text_from_image_front_camera, get_text_from_image_back_camera, get_text_from_audio, analyze_combined_results
import os

app = Flask(__name__)
CORS(app)

# Create uploads folder
os.makedirs('uploads', exist_ok=True)



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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)