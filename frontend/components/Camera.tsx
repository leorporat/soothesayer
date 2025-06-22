import React, { useEffect, useRef, useState } from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';

export default function VideoRecorder() {
  const [hasPermission, requestPermission] = useCameraPermissions();
  const frontCameraRef = useRef<CameraView>(null);
  const backCameraRef = useRef<CameraView>(null);
  const [recording, setRecording] = useState(false);
  const [frameCapturing, setFrameCapturing] = useState(false);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef(false); // Ref to track recording state

  // Rate limiting state
  const lastRequestTime = useRef<number>(0);
  const requestCount = useRef<number>(0);
  const REQUEST_COOLDOWN = 5000; // 5 seconds between requests
  const MAX_REQUESTS_PER_MINUTE = 10;

  useEffect(() => {
    if (hasPermission?.granted === false) {
      requestPermission();
    }
  }, [hasPermission]);

  // Enhanced logging with rate limiting
  const logCameraRequest = (type: string, message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`📸 [CAMERA-${type}] ${timestamp}: ${message}`);
  };

  // Rate limiting check
  const canMakeRequest = (): boolean => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    
    // Reset request count every minute
    if (timeSinceLastRequest > 60000) {
      requestCount.current = 0;
    }
    
    // Check if we're within rate limits
    if (timeSinceLastRequest < REQUEST_COOLDOWN) {
      logCameraRequest('RATE-LIMIT', `Request blocked - cooldown active (${REQUEST_COOLDOWN - timeSinceLastRequest}ms remaining)`);
      return false;
    }
    
    if (requestCount.current >= MAX_REQUESTS_PER_MINUTE) {
      logCameraRequest('RATE-LIMIT', `Request blocked - max requests per minute reached (${requestCount.current}/${MAX_REQUESTS_PER_MINUTE})`);
      return false;
    }
    
    return true;
  };

  const sendFrontFrameToBackend = async (imageUri: string) => {
    if (!canMakeRequest()) return;
    
    try {
      lastRequestTime.current = Date.now();
      requestCount.current++;
      
      logCameraRequest('FACE-START', `Sending face analysis request (${requestCount.current}/${MAX_REQUESTS_PER_MINUTE})`);
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'front_camera.jpg',
      } as any);

      const response = await fetch('http://localhost:5001/api/analyze/face-sentiment', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      logCameraRequest('FACE-SUCCESS', `Face sentiment analysis completed`);
      console.log('😊 Face sentiment analysis:', result);
      return result;
    } catch (error) {
      logCameraRequest('FACE-ERROR', `Face analysis failed: ${error}`);
      console.error('❌ Error sending front frame to backend:', error);
    }
  };

  const sendBackFrameToBackend = async (imageUri: string) => {
    if (!canMakeRequest()) return;
    
    try {
      lastRequestTime.current = Date.now();
      requestCount.current++;
      
      logCameraRequest('ENV-START', `Sending environment analysis request (${requestCount.current}/${MAX_REQUESTS_PER_MINUTE})`);
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'back_camera.jpg',
      } as any);

      const response = await fetch('http://localhost:5001/api/analyze/environment-sentiment', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      logCameraRequest('ENV-SUCCESS', `Environment analysis completed`);
      console.log('🌍 Environment analysis:', result);
      return result;
    } catch (error) {
      logCameraRequest('ENV-ERROR', `Environment analysis failed: ${error}`);
      console.error('❌ Error sending back frame to backend:', error);
    }
  };

  // Capture frames from both cameras during recording
  const captureFrames = async () => {
    logCameraRequest('CAPTURE-START', `Frame capture triggered - recording: ${recordingRef.current}`);
    
    if (recordingRef.current) {
      const timestamp = new Date().toLocaleTimeString();
      logCameraRequest('CAPTURE-ACTIVE', `Dual camera capture starting at ${timestamp}`);
      
      let frontCaptured = false;
      let backCaptured = false;

      // Capture from front camera (face analysis) - with rate limiting
      if (frontCameraRef.current && canMakeRequest()) {
        try {
          logCameraRequest('CAPTURE-FRONT', `Attempting front camera capture...`);
          const frontPhoto = await frontCameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: false,
          });
          logCameraRequest('CAPTURE-FRONT', `✅ Front camera frame captured: ${frontPhoto.uri}`);
          await sendFrontFrameToBackend(frontPhoto.uri);
          frontCaptured = true;
        } catch (error) {
          logCameraRequest('CAPTURE-FRONT', `❌ Front camera capture failed: ${error}`);
        }
      } else {
        logCameraRequest('CAPTURE-FRONT', `⚠️ Front camera capture skipped (rate limited or no ref)`);
      }

      // Capture from back camera (environment analysis) - with rate limiting  
      if (backCameraRef.current && canMakeRequest()) {
        try {
          logCameraRequest('CAPTURE-BACK', `Attempting back camera capture...`);
          const backPhoto = await backCameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: false,
          });
          logCameraRequest('CAPTURE-BACK', `✅ Back camera frame captured: ${backPhoto.uri}`);
          await sendBackFrameToBackend(backPhoto.uri);
          backCaptured = true;
        } catch (error) {
          logCameraRequest('CAPTURE-BACK', `❌ Back camera capture failed: ${error}`);
        }
      } else {
        logCameraRequest('CAPTURE-BACK', `⚠️ Back camera capture skipped (rate limited or no ref)`);
      }

      // Summary log
      logCameraRequest('CAPTURE-COMPLETE', `Capture summary: Front=${frontCaptured ? '✅' : '❌'}, Back=${backCaptured ? '✅' : '❌'}`);
    }
  };

  // Start frame capture interval with longer interval to reduce requests
  const startFrameCapture = () => {
    setFrameCapturing(true);
    // Increased interval to 10 seconds to reduce API load
    frameIntervalRef.current = setInterval(captureFrames, 10000);
    logCameraRequest('INTERVAL-START', `Frame capture interval started (every 10 seconds)`);
  };

  // Stop frame capture interval
  const stopFrameCapture = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
      setFrameCapturing(false);
      logCameraRequest('INTERVAL-STOP', `Frame capture interval stopped`);
    }
  };

  const startRecording = async () => {
    console.log('🎥 Dual camera recording STARTED');
    setRecording(true);
    recordingRef.current = true; // Update ref immediately
    
    // Start frame capture immediately now that ref is updated
    startFrameCapture();
    
    // Start recording from back camera (main video)
    if (backCameraRef.current) {
      const video = await backCameraRef.current.recordAsync();
      console.log('🛑 Camera recording STOPPED');
      console.log('Video URI:', video?.uri);
      
      // Stop frame capture when recording ends
      stopFrameCapture();
      recordingRef.current = false; // Update ref immediately
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (recordingRef.current) {
      console.log('⏹️ Manually stopping dual camera recording...');
      recordingRef.current = false; // Update ref immediately
      stopFrameCapture();
      
      // Stop back camera recording
      if (backCameraRef.current) {
        backCameraRef.current.stopRecording();
      }
    }
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={styles.container}>
      {/* Back Camera - Main View */}
      <CameraView 
        facing="back" 
        style={styles.mainCamera} 
        ref={backCameraRef} 
      />
      
      {/* Front Camera - Picture-in-Picture */}
      <CameraView 
        facing="front" 
        style={styles.frontCamera} 
        ref={frontCameraRef} 
      />
      
      <Button
        title={recording ? 'Stop Recording' : 'Start Dual Recording'}
        onPress={recording ? stopRecording : startRecording}
        color="white"

      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainCamera: {
    marginTop: 100,
    width: '95%',
    height: 300,
    borderRadius: 15,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'white',
    color: 'black',
  },
  frontCamera: {
    position: 'absolute',
    top: 30,
    right: 20,
    width: 120,
    height: 180,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#3b82f6',
    backgroundColor: '#000',
    zIndex: 10,
  },

});
