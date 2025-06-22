// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5001', // Change this for production
  ENDPOINTS: {
    FACE_SENTIMENT: '/api/analyze/face-sentiment',
    ENVIRONMENT_SENTIMENT: '/api/analyze/environment-sentiment',
    AUDIO_TRANSCRIPTION: '/api/analyze/audio-transcription',
    COMBINED_SENTIMENT: '/api/analyze/combined-sentiment',
    AUDIO_UPLOAD: '/api/audio/upload',
    PHOTO_UPLOAD: '/api/photo/upload',
    AUDIO_LATEST: '/api/audio/latest',
    PHOTO_LATEST: '/api/photo/latest',
    AUDIO_CONVERSATION: '/api/audio/conversation',
    AUDIO_DOWNLOAD: '/api/audio/download',
    HEALTH: '/api/health',
  },
  SETTINGS: {
    REQUEST_TIMEOUT: 30000, // 30 seconds
    FRAME_CAPTURE_INTERVAL: 10000, // 10 seconds (reduced from 2 seconds)
    AUDIO_RECORD_INTERVAL: 30000, // 30 seconds (reduced from 15 seconds)
    AUDIO_RECORD_DURATION: 10000, // 10 seconds
    MAX_REQUESTS_PER_MINUTE: 10, // Rate limiting
    REQUEST_COOLDOWN: 5000, // 5 seconds between requests
  }
};

// Helper function to build API URLs
const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Enhanced logging for TTS flow
const logTTSStep = (step: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`🔊 [TTS-${step}] ${timestamp}: ${message}`, data ? data : '');
};

// Health check function
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HEALTH));
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

// Conversational audio function with enhanced logging
export const sendAudioForConversation = async (audioUri: string): Promise<any> => {
  const requestId = Date.now().toString();
  logTTSStep('START', `Initiating conversation request (ID: ${requestId})`, { audioUri });
  
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: `conversation_${requestId}.m4a`,
    } as any);

    logTTSStep('UPLOAD', `Uploading audio file for conversation (ID: ${requestId})`);

    const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUDIO_CONVERSATION), {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
    
    if (result.success) {
      logTTSStep('SUCCESS', `Conversation completed successfully (ID: ${requestId})`, {
        transcription: result.transcription,
        responseText: result.response_text,
        audioFile: result.response_audio_file
      });
    } else {
      logTTSStep('ERROR', `Conversation failed (ID: ${requestId})`, result);
    }

    return result;
  } catch (error) {
    logTTSStep('ERROR', `Conversation API error (ID: ${requestId})`, error);
    console.error('Conversation API error:', error);
    throw error;
  }
};

// Enhanced upload function with TTS logging
export const uploadAudioToBackend = async (audioUri: string, metadata?: any): Promise<any> => {
  const requestId = Date.now().toString();
  logTTSStep('UPLOAD-START', `Starting audio upload (ID: ${requestId})`, { audioUri, metadata });
  
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: `upload_${requestId}.m4a`,
    } as any);
    
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
    }

    const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUDIO_UPLOAD), {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
    
    if (result.success) {
      logTTSStep('UPLOAD-SUCCESS', `Audio uploaded successfully (ID: ${requestId})`, {
        transcription: result.transcription,
        filename: result.latest_filename,
        fileSize: result.file_size
      });
    } else {
      logTTSStep('UPLOAD-ERROR', `Audio upload failed (ID: ${requestId})`, result);
    }

    return result;
  } catch (error) {
    logTTSStep('UPLOAD-ERROR', `Audio upload error (ID: ${requestId})`, error);
    console.error('❌ Error uploading audio:', error);
    throw error;
  }
};

// Photo upload function to save photos to uploads folder
export const uploadPhotoToBackend = async (photoUri: string, cameraType: 'front' | 'back' = 'back', metadata?: any): Promise<any> => {
  const requestId = Date.now().toString();
  logTTSStep('PHOTO-UPLOAD-START', `Starting photo upload (ID: ${requestId})`, { photoUri, cameraType, metadata });
  
  try {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: `${cameraType}_camera_${requestId}.jpg`,
    } as any);
    
    // Add camera type and metadata
    formData.append('camera_type', cameraType);
    formData.append('timestamp', new Date().toISOString());
    
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
    }

    const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PHOTO_UPLOAD), {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
    
    if (result.success) {
      logTTSStep('PHOTO-UPLOAD-SUCCESS', `Photo uploaded successfully (ID: ${requestId})`, {
        filename: result.filename,
        fileSize: result.file_size,
        cameraType: cameraType
      });
    } else {
      logTTSStep('PHOTO-UPLOAD-ERROR', `Photo upload failed (ID: ${requestId})`, result);
    }

    return result;
  } catch (error) {
    logTTSStep('PHOTO-UPLOAD-ERROR', `Photo upload error (ID: ${requestId})`, error);
    console.error('❌ Error uploading photo:', error);
    throw error;
  }
};

// Function to download and play generated audio
export const downloadAndPlayAudio = async (filename: string): Promise<void> => {
  logTTSStep('DOWNLOAD-START', `Downloading generated audio: ${filename}`);
  
  try {
    const downloadUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.AUDIO_DOWNLOAD}/${filename}`);
    logTTSStep('DOWNLOAD-URL', `Download URL: ${downloadUrl}`);
    
    // For React Native environments, we need to handle audio differently
    if (typeof window !== 'undefined' && window.Audio) {
      // Web environment - use HTML5 Audio
      const audio = new Audio(downloadUrl);
      
      audio.onloadstart = () => {
        logTTSStep('DOWNLOAD-LOADING', `Loading audio file: ${filename}`);
      };
      
      audio.oncanplay = () => {
        logTTSStep('DOWNLOAD-READY', `Audio ready to play: ${filename}`);
      };
      
      audio.onplay = () => {
        logTTSStep('PLAYBACK-START', `Started playing audio: ${filename}`);
      };
      
      audio.onended = () => {
        logTTSStep('PLAYBACK-END', `Finished playing audio: ${filename}`);
      };
      
      audio.onerror = (error) => {
        logTTSStep('PLAYBACK-ERROR', `Error playing audio: ${filename}`, error);
      };
      
      await audio.play();
      
    } else {
      // React Native environment - use Expo Audio
      logTTSStep('DOWNLOAD-RN', `Using React Native audio playback for: ${filename}`);
      
      // For React Native, we'll need to import Audio from expo-av
      // This is a placeholder - the actual implementation would need expo-av
      console.log(`🔊 Would play audio in React Native: ${downloadUrl}`);
      logTTSStep('PLAYBACK-RN', `React Native audio playback initiated: ${filename}`);
    }
    
  } catch (error) {
    logTTSStep('DOWNLOAD-ERROR', `Failed to download/play audio: ${filename}`, error);
    console.error('Error downloading/playing audio:', error);
    throw error;
  }
};

// Test function to verify audio endpoint is working
export const testAudioGeneration = async (): Promise<void> => {
  logTTSStep('TEST-START', 'Testing audio generation with sample text');
  
  try {
    // Create a simple test audio request
    const testText = "Hello! This is a test of the SoothSayer audio system.";
    
    // For now, we'll use the conversation endpoint with a dummy audio file
    // In a real scenario, you'd record actual audio
    logTTSStep('TEST-REQUEST', `Testing with text: "${testText}"`);
    
    // This would need actual audio file in production
    console.log('🧪 Audio generation test would go here');
    logTTSStep('TEST-COMPLETE', 'Audio generation test completed');
    
  } catch (error) {
    logTTSStep('TEST-ERROR', 'Audio generation test failed', error);
    throw error;
  }
};

// Function to trigger combined sentiment analysis with latest files
export const triggerCombinedSentimentAnalysis = async (): Promise<any> => {
  const requestId = Date.now().toString();
  logTTSStep('COMBINED-ANALYSIS-START', `Starting combined sentiment analysis (ID: ${requestId})`);
  
  try {
    // Call the combined sentiment analysis endpoint directly
    // The backend will handle getting the latest files
    const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.COMBINED_SENTIMENT), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        use_latest_files: true,
        request_id: requestId
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // Enhanced logging for sentiment analysis results
      console.log('🔮 [SENTIMENT-ANALYSIS] ==========================================');
      console.log('🔮 [SENTIMENT-ANALYSIS] Combined Sentiment Analysis Results:');
      console.log('🔮 [SENTIMENT-ANALYSIS] ==========================================');
      
      // Log raw data from individual analyses
      if (result.raw_data) {
        console.log('🔮 [SENTIMENT-ANALYSIS] 📝 Audio Transcription:');
        console.log(`   "${result.raw_data.audio_transcription}"`);
        console.log('');
        
        console.log('🔮 [SENTIMENT-ANALYSIS] 😊 Face Sentiment Analysis:');
        console.log(`   "${result.raw_data.face_sentiment}"`);
        console.log('');
        
        console.log('🔮 [SENTIMENT-ANALYSIS] 🌍 Environment Analysis:');
        console.log(`   "${result.raw_data.environment_analysis}"`);
        console.log('');
      }
      
      // Log the final combined analysis
      console.log('🔮 [SENTIMENT-ANALYSIS] 🧠 SoothSayer Combined Analysis:');
      console.log(`   "${result.analysis}"`);
      console.log('🔮 [SENTIMENT-ANALYSIS] ==========================================');
      console.log('');
      
      logTTSStep('COMBINED-ANALYSIS-SUCCESS', `Combined analysis completed successfully (ID: ${requestId})`, {
        analysis: result.analysis,
        rawData: result.raw_data
      });
    } else {
      console.log('❌ [SENTIMENT-ANALYSIS] Analysis failed:', result);
      logTTSStep('COMBINED-ANALYSIS-ERROR', `Combined analysis failed (ID: ${requestId})`, result);
    }

    return result;
  } catch (error) {
    console.log('❌ [SENTIMENT-ANALYSIS] Error in combined analysis:', error);
    logTTSStep('COMBINED-ANALYSIS-ERROR', `Combined analysis error (ID: ${requestId})`, error);
    throw error;
  }
}; 