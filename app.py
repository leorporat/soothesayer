from flask import Flask, request, jsonify

from PIL import Image
from SoothSayer import SoothSayer

app = Flask(__name__)

client= SoothSayer()

# Example route
@app.route('/api/get_audio', methods=['GET'])
def get_audio():
    data = request.files

    image_front = data['image_front']
    image_back  = data['image_back']
    audio       = data['audio']

    client.input_to_audio(image_front, image_back, audio)

    return jsonify({'message': 'pong'}), 200