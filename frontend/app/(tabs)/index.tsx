import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import VideoRecorder from '@/components/Camera';
import { uploadAudioToBackend, uploadPhotoToBackend, triggerCombinedSentimentAnalysis } from '@/constants/Api';
import { CameraView, useCameraPermissions } from 'expo-camera';

// Enhanced logging for audio flow
const logAudioFlow = (step: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`🎤 [HOME-AUDIO-${step}] ${timestamp}: ${message}`, data ? data : '');
};

export default function HomeScreen() {
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isIntervalRecordingOn, setIsIntervalRecordingOn] = useState(false);
  const [recordedAudios, setRecordedAudios] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isVoiceButtonPressed, setIsVoiceButtonPressed] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Camera state and refs for photo capture
  const [hasCameraPermission, requestCameraPermission] = useCameraPermissions();
  const frontCameraRef = useRef<CameraView>(null);
  const backCameraRef = useRef<CameraView>(null);

  // Request audio permissions on component mount
  useEffect(() => {
    (async () => {
      logAudioFlow('PERMISSION', 'Requesting audio permissions');
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        logAudioFlow('PERMISSION', 'Audio permissions granted');
      } else {
        logAudioFlow('PERMISSION', 'Audio permissions denied');
      }
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      logAudioFlow('SETUP', 'Audio mode configured');
    })();
  }, []);

  // Handle interval audio recording
  useEffect(() => {
    if (isIntervalRecordingOn && hasPermission) {
      logAudioFlow('INTERVAL', 'Starting interval recording mode');
      
      // Start first recording immediately
      const startFirstRecording = async () => {
        try {
          logAudioFlow('INTERVAL', 'Starting first interval recording...');
          await startRecording();
          
          // Capture photos at the same time
          await captureAndUploadPhotos();
          
          // Trigger combined sentiment analysis with latest files
          try {
            await triggerCombinedSentimentAnalysis();
            logAudioFlow('ANALYSIS', 'Combined sentiment analysis completed');
          } catch (analysisError) {
            logAudioFlow('ANALYSIS', 'Combined sentiment analysis failed', analysisError);
          }
          
          // Stop recording after 5 seconds
          setTimeout(async () => {
            await stopRecording();
          }, 5000);
        } catch (error) {
          logAudioFlow('INTERVAL', 'Error in first interval recording', error);
        }
      };
      
      startFirstRecording();
      
      // Set up interval for subsequent recordings
      intervalRef.current = setInterval(async () => {
        // Only start new recording if not currently recording
        if (!recording) {
          try {
            logAudioFlow('INTERVAL', 'Starting interval audio recording...');
            await startRecording();
            
            // Capture photos at the same time
            await captureAndUploadPhotos();
            
            // Trigger combined sentiment analysis with latest files
            try {
              await triggerCombinedSentimentAnalysis();
              logAudioFlow('ANALYSIS', 'Combined sentiment analysis completed');
            } catch (analysisError) {
              logAudioFlow('ANALYSIS', 'Combined sentiment analysis failed', analysisError);
            }
            
            // Stop recording after 5 seconds
            setTimeout(async () => {
              await stopRecording();
            }, 5000);
            
          } catch (error) {
            logAudioFlow('INTERVAL', 'Error in interval recording', error);
            console.error('Error in interval recording:', error);
          }
        } else {
          logAudioFlow('INTERVAL', 'Skipping recording - already recording');
        }
      }, 10000); // 10 seconds between recordings
    } else {
      // Clear interval when turned off
      if (intervalRef.current) {
        logAudioFlow('INTERVAL', 'Stopping interval recording mode');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isIntervalRecordingOn, hasPermission, recording]);

  const startRecording = async () => {
    try {
      logAudioFlow('RECORD', 'Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      // Set isRecordingAudio to true for both manual and interval recording
      setIsRecordingAudio(true);
      logAudioFlow('RECORD', 'Recording started successfully');
      console.log('Recording started');
    } catch (err) {
      logAudioFlow('RECORD', 'Failed to start recording', err);
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      logAudioFlow('RECORD', 'Stopping recording...');
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        logAudioFlow('RECORD', 'Recording saved', { uri });
        console.log('Recording saved to', uri);
        
        // Upload to backend using enhanced API function
        if (uri) {
          logAudioFlow('UPLOAD', 'Uploading recorded audio to backend');
          try {
            await uploadAudioToBackend(uri);
            logAudioFlow('UPLOAD', 'Audio uploaded successfully');
            setRecordedAudios(prev => [...prev, uri]);
          } catch (uploadError) {
            logAudioFlow('UPLOAD', 'Failed to upload audio', uploadError);
            console.error('Failed to upload audio:', uploadError);
          }
        }
        
        setRecording(null);
        setIsRecordingAudio(false);
        logAudioFlow('RECORD', 'Recording stopped and cleaned up');
      } else {
        logAudioFlow('RECORD', 'No recording to stop');
      }
    } catch (err) {
      logAudioFlow('RECORD', 'Failed to stop recording', err);
      console.error('Failed to stop recording', err);
      // Always clean up the recording object even on error
      setRecording(null);
      setIsRecordingAudio(false);
    }
  };

  // Capture and upload photos from both cameras
  const captureAndUploadPhotos = async () => {
    if (!hasCameraPermission?.granted) {
      logAudioFlow('PHOTO', 'Camera permission not granted');
      return;
    }

    logAudioFlow('PHOTO', 'Starting photo capture and upload...');
    
    try {
      // Capture from front camera
      if (frontCameraRef.current) {
        try {
          const frontPhoto = await frontCameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: false,
          });
          logAudioFlow('PHOTO', 'Front camera photo captured');
          
          // Upload front camera photo
          await uploadPhotoToBackend(frontPhoto.uri, 'front', {
            analysis_type: 'face_sentiment',
            timestamp: new Date().toISOString()
          });
          logAudioFlow('PHOTO', 'Front camera photo uploaded successfully');
        } catch (error) {
          logAudioFlow('PHOTO', 'Front camera capture failed', error);
        }
      }

      // Capture from back camera
      if (backCameraRef.current) {
        try {
          const backPhoto = await backCameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: false,
          });
          logAudioFlow('PHOTO', 'Back camera photo captured');
          
          // Upload back camera photo
          await uploadPhotoToBackend(backPhoto.uri, 'back', {
            analysis_type: 'environment_sentiment',
            timestamp: new Date().toISOString()
          });
          logAudioFlow('PHOTO', 'Back camera photo uploaded successfully');
        } catch (error) {
          logAudioFlow('PHOTO', 'Back camera capture failed', error);
        }
      }
    } catch (error) {
      logAudioFlow('PHOTO', 'Photo capture and upload failed', error);
    }
  };

  const handleSliderPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const sliderWidth = 300;
    const percentage = Math.max(0, Math.min(100, (locationX / sliderWidth) * 100));
    setSliderValue(Math.round(percentage));
  };

  const toggleManualRecording = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
      return;
    }

    // Toggle interval recording on/off
    setIsIntervalRecordingOn(!isIntervalRecordingOn);
  };

  const triggerCombinedAnalysis = async (faceImageUri: string, envImageUri: string, audioUri: string) => {
    try {
      const formData = new FormData();
      
      formData.append('face_image', {
        uri: faceImageUri,
        type: 'image/jpeg',
        name: 'face.jpg',
      } as any);
      
      formData.append('environment_image', {
        uri: envImageUri,
        type: 'image/jpeg',
        name: 'environment.jpg',
      } as any);
      
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any);

      const response = await fetch('http://localhost:5001/api/analyze/combined-sentiment', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      console.log('🔮 Combined analysis result:', result);
      
      // Play the generated audio response
      if (result.success) {
        Alert.alert('Analysis Complete', result.analysis);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error with combined analysis:', error);
      Alert.alert('Error', 'Failed to get combined analysis');
    }
  };

  if (hasPermission === null) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.loadingText}>Requesting microphone permission...</ThemedText>
      </ThemedView>
    );
  }

  if (hasPermission === false) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>No access to microphone</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Account Settings Button - Top Right */}
      <TouchableOpacity style={styles.accountButton} onPress={() => {}}>
        <IconSymbol name="person.circle.fill" size={32} color="#60a5fa" />
      </TouchableOpacity>

      {/* Camera View - Top Half with Beautiful Background */}
      <View style={styles.cameraContainer}>
        <VideoRecorder 
          frontCameraRef={frontCameraRef}
          backCameraRef={backCameraRef}
        />
      </View>

      {/* Recording Buttons - Below Camera - Moved Down */}
      <View style={styles.buttonContainer}>
        {/* Beautiful Slider Meter - Moved Up */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderLabels}>
            <ThemedText style={styles.sliderLabel}>Low</ThemedText>
            <View style={styles.sliderValueContainer}>
              <ThemedText style={styles.sliderValue}>
                Sensitivity: {Math.round(sliderValue)}%
              </ThemedText>
            </View>
            <ThemedText style={styles.sliderLabel}>High</ThemedText>
          </View>
          
          <TouchableOpacity
            style={styles.sliderTrack}
            onPress={handleSliderPress}
            activeOpacity={1}
          >
            <View style={styles.sliderBackground}>
              {/* Fill */}
              <View 
                style={[
                  styles.sliderFill,
                  { width: `${sliderValue}%` }
                ]} 
              />
              
              {/* Thumb */}
              <View 
                style={[
                  styles.sliderThumb,
                  { left: `${sliderValue}%` }
                ]} 
              />
            </View>
          </TouchableOpacity>
          
          <View style={styles.sliderRange}>
            <ThemedText style={styles.sliderRangeText}>0%</ThemedText>
            <ThemedText style={styles.sliderRangeText}>100%</ThemedText>
          </View>
        </View>

        {/* Square Record Buttons with Beautiful Styling - Moved Down */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isIntervalRecordingOn ? styles.recordingButton : styles.voiceButton
            ]}
            onPress={toggleManualRecording}
            activeOpacity={1}
          >
            <View style={styles.iconWrapper}>
              <IconSymbol 
                name={isIntervalRecordingOn ? "stop.fill" : "mic.fill"} 
                size={32} 
                color="white" 
              />
            </View>
            <ThemedText style={styles.buttonText}>
              {isIntervalRecordingOn ? 'Stop\nRecording' : 'Start\nRecording'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recordButton, 
              styles.videoButton
            ]}
            onPress={() => {
              // Placeholder for video functionality
              Alert.alert('Video Recording', 'Video recording feature coming soon!');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrapper}>
              <IconSymbol 
                name="video.fill" 
                size={32} 
                color="white" 
              />
            </View>
            <ThemedText style={styles.buttonText}>
              Record\nVideo
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Audio Status Display */}
        <View style={styles.audioStatusContainer}>
          <ThemedText style={styles.audioStatusText}>
            {isIntervalRecordingOn 
              ? `Auto-recording every 10s (${recordedAudios.length} files)` 
              : `Recorded: ${recordedAudios.length} files`
            }
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  accountButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  cameraContainer: {
    height: '50%',
    backgroundColor: '#1e3a8a',
  },
  cameraContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCard: {
    width: '100%',
    height: '60%',
    marginTop: 50,
    padding: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    padding: 24,
    marginBottom: 16,
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cameraSubtitle: {
    color: '#bfdbfe',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 20,
  },
  recordButton: {
    width: 144,
    height: 144,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  voiceButton: {
    backgroundColor: '#3b82f6',
  },
  voiceButtonPressed: {
    backgroundColor: '#1e40af', // Darker blue for pressed state
  },
  videoButton: {
    backgroundColor: '#4b5563',
  },
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  audioStatusContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: -20,
    marginTop: 10,
  },
  audioStatusText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sliderContainer: {
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  sliderLabel: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '500',
  },
  sliderValueContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sliderValue: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sliderTrack: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
  },
  sliderBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    position: 'absolute',
    top: -8,
    marginLeft: -12,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sliderRangeText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
});