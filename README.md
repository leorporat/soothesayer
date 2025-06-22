# SoothSayer 🤖

A real-time multimodal sentiment analysis system that combines facial expressions, environmental context, and speech to provide comprehensive emotional insights and recommendations.

## 🌟 Overview

SoothSayer is an intelligent assistant that analyzes your emotional state and surroundings in real-time using:
- **Facial Expression Analysis** - Detects emotions from facial cues and body language
- **Environmental Context** - Understands your surroundings and potential obstacles
- **Speech Analysis** - Transcribes and analyzes your spoken words for sentiment
- **Movement Guidance** - Calculates optimal movement angles for navigation

The system provides conversational feedback and recommendations based on this comprehensive analysis.

## 🏗️ Architecture

### Frontend (React Native + Expo)
- **Real-time Audio Recording** - Continuous audio capture with configurable sensitivity
- **Dual Camera System** - Simultaneous front and back camera capture
- **Beautiful UI** - Modern, intuitive interface with real-time feedback
- **Interval Recording** - Automated recording and analysis cycles

### Backend (Python + Flask)
- **GROQ AI Integration** - Uses state-of-the-art LLMs for analysis
- **MiDaS Depth Estimation** - 3D depth mapping for movement guidance
- **Multimodal Processing** - Combines visual, audio, and environmental data
- **RESTful API** - Clean endpoints for frontend communication

## 🚀 Features

### Real-time Analysis
- **Continuous Monitoring** - Records and analyzes data every 10 seconds
- **Instant Feedback** - Provides immediate emotional insights
- **Context Awareness** - Understands both personal and environmental factors

### Multimodal Input Processing
- **Facial Sentiment Analysis** - Detects primary and secondary emotions
- **Environmental Understanding** - Identifies objects and context in surroundings
- **Speech Transcription** - Converts audio to text for content analysis
- **Movement Optimization** - Calculates optimal navigation paths

### Smart Recommendations
- **Emotional Insights** - Provides detailed emotional state analysis
- **Conversational Responses** - Natural language feedback and suggestions
- **Contextual Guidance** - Recommendations based on current situation

## 📱 Screenshots

*[Screenshots would be added here]*

## 🛠️ Technology Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **Expo Camera** - Camera and audio recording
- **Expo File System** - File management and uploads

### Backend
- **Python 3.12+** - Core programming language
- **Flask** - Web framework for API
- **GROQ API** - AI/LLM services
- **MiDaS** - Depth estimation models
- **OpenCV** - Computer vision processing
- **PyTorch** - Deep learning framework
- **Poetry** - Dependency management

### AI/ML Services
- **GROQ Llama Models** - Text analysis and generation
- **GROQ Whisper** - Speech-to-text transcription
- **GROQ Vision Models** - Image analysis and sentiment detection
- **MiDaS** - Monocular depth estimation

## 📋 Prerequisites

- **Node.js** 18+ and **npm** or **yarn**
- **Python** 3.12+
- **Poetry** (Python package manager)
- **Expo CLI**
- **iOS Simulator** or **Android Emulator** (for mobile testing)
- **GROQ API Key** - Get one at [groq.com](https://groq.com)

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/soothsayer.git
cd soothsayer
```

### 2. Backend Setup
```bash
cd backend

# Install Python dependencies
poetry install

# Set up environment variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Run the backend server
poetry run python app.py
```

The backend will start on `http://localhost:5001`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npx expo start
```

### 4. Mobile App Setup
- Install **Expo Go** app on your mobile device
- Scan the QR code from the Expo development server
- Or run on iOS Simulator/Android Emulator

## 🔑 Environment Variables

Create a `.env` file in the `backend` directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

## 📖 Usage

### Starting the System

1. **Start Backend Server**
   ```bash
   cd backend
   poetry run python app.py
   ```

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npx expo start
   ```

3. **Open Mobile App**
   - Use Expo Go app to scan QR code
   - Or press `i` for iOS Simulator / `a` for Android Emulator

### Using the App

1. **Grant Permissions**
   - Allow microphone access for audio recording
   - Allow camera access for photo capture

2. **Configure Sensitivity**
   - Adjust the sensitivity slider (0-100%)
   - Higher sensitivity = more frequent recordings

3. **Start Recording**
   - Tap "Start Recording" to begin automated analysis
   - The system will record every 10 seconds
   - Photos are captured from both cameras simultaneously

4. **View Results**
   - Analysis results appear in real-time
   - Emotional insights and recommendations are provided
   - Audio responses are generated and played

## 🔌 API Endpoints

### Core Analysis Endpoints
- `POST /api/analyze/face-sentiment` - Analyze facial expressions
- `POST /api/analyze/environment-sentiment` - Analyze surroundings
- `POST /api/analyze/audio-transcription` - Transcribe speech
- `POST /api/analyze/combined-sentiment` - Comprehensive multimodal analysis

### File Management Endpoints
- `POST /api/audio/upload` - Upload audio files
- `POST /api/photo/upload` - Upload photos
- `GET /api/audio/latest` - Get latest audio file
- `GET /api/photo/latest` - Get latest photos

### Utility Endpoints
- `GET /api/health` - Health check

## 🧪 Testing

### Backend Testing
```bash
cd backend
poetry run python -c "from SoothSayer import SoothSayer; print('✅ Backend ready')"
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 🐛 Troubleshooting

### Common Issues

1. **GROQ API Errors**
   - Verify your API key is correct
   - Check your GROQ account balance
   - Ensure you're using the correct model names

2. **Camera Permission Issues**
   - Grant camera permissions in device settings
   - Restart the Expo development server

3. **Audio Recording Problems**
   - Check microphone permissions
   - Ensure device is not in silent mode
   - Restart the app if needed

4. **Backend Connection Issues**
   - Verify backend is running on port 5001
   - Check firewall settings
   - Ensure correct API endpoints in frontend

### Debug Mode

Enable detailed logging by setting environment variables:
```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GROQ** for providing fast AI inference
- **Intel ISL** for the MiDaS depth estimation models
- **Expo** for the excellent development platform
- **React Native** community for the robust mobile framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/soothsayer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/soothsayer/discussions)
- **Email**: your.email@example.com

## 🔮 Roadmap

- [ ] **Voice Emotion Analysis** - Analyze tone and pitch for emotional context
- [ ] **Real-time Video Analysis** - Continuous video sentiment analysis
- [ ] **Machine Learning Models** - Custom trained models for specific use cases
- [ ] **Cloud Deployment** - AWS/Azure deployment options
- [ ] **Mobile App Stores** - iOS App Store and Google Play Store releases
- [ ] **Web Dashboard** - Browser-based analysis interface
- [ ] **API Documentation** - Interactive API documentation with Swagger
- [ ] **Multi-language Support** - Internationalization for global users

---

**Made with ❤️ by the SoothSayer Team**
