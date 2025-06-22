import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { uploadPhotoToBackend } from '@/constants/Api';

interface VideoRecorderProps {
  frontCameraRef?: React.RefObject<CameraView | null>;
  backCameraRef?: React.RefObject<CameraView | null>;
}

const VideoRecorder = forwardRef<any, VideoRecorderProps>(({ frontCameraRef: externalFrontRef, backCameraRef: externalBackRef }, ref) => {
  const [hasPermission, requestPermission] = useCameraPermissions();
  const internalFrontCameraRef = useRef<CameraView>(null);
  const internalBackCameraRef = useRef<CameraView>(null);
  
  // Use external refs if provided, otherwise use internal ones
  const frontCameraRef = externalFrontRef || internalFrontCameraRef;
  const backCameraRef = externalBackRef || internalBackCameraRef;
  
  const [recording, setRecording] = useState(false);
  const [frameCapturing, setFrameCapturing] = useState(false);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef(false); // Ref to track recording state

  useEffect(() => {
    if (hasPermission?.granted === false) {
      requestPermission();
    }
  }, [hasPermission]);

  // Enhanced logging
  const logCameraRequest = (type: string, message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`📸 [CAMERA-${type}] ${timestamp}: ${message}`);
  };

  const sendFrontFrameToBackend = async (imageUri: string) => {
    try {
      logCameraRequest('FACE-START', `Sending face analysis request`);
      
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
    try {
      logCameraRequest('ENV-START', `Sending environment analysis request`);
      
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

      // Capture from front camera (face analysis)
      if (frontCameraRef.current) {
        try {
          logCameraRequest('CAPTURE-FRONT', `Attempting front camera capture...`);
          const frontPhoto = await frontCameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: false,
          });
          logCameraRequest('CAPTURE-FRONT', `✅ Front camera frame captured: ${frontPhoto.uri}`);
          
          // Send to face analysis endpoint
          await sendFrontFrameToBackend(frontPhoto.uri);
          
          // Also upload to uploads folder
          try {
            await uploadPhotoToBackend(frontPhoto.uri, 'front', {
              analysis_type: 'face_sentiment',
              timestamp: new Date().toISOString()
            });
            logCameraRequest('UPLOAD-FRONT', `✅ Front camera photo uploaded to uploads folder`);
          } catch (uploadError) {
            logCameraRequest('UPLOAD-FRONT', `❌ Front camera photo upload failed: ${uploadError}`);
          }
          
          frontCaptured = true;
        } catch (error) {
          logCameraRequest('CAPTURE-FRONT', `❌ Front camera capture failed: ${error}`);
        }
      } else {
        logCameraRequest('CAPTURE-FRONT', `⚠️ Front camera capture skipped (no ref)`);
      }

      // Capture from back camera (environment analysis)
      if (backCameraRef.current) {
        try {
          logCameraRequest('CAPTURE-BACK', `Attempting back camera capture...`);
          const backPhoto = await backCameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: false,
          });
          logCameraRequest('CAPTURE-BACK', `✅ Back camera frame captured: ${backPhoto.uri}`);
          
          // Send to environment analysis endpoint
          await sendBackFrameToBackend(backPhoto.uri);
          
          // Also upload to uploads folder
          try {
            await uploadPhotoToBackend(backPhoto.uri, 'back', {
              analysis_type: 'environment_sentiment',
              timestamp: new Date().toISOString()
            });
            logCameraRequest('UPLOAD-BACK', `✅ Back camera photo uploaded to uploads folder`);
          } catch (uploadError) {
            logCameraRequest('UPLOAD-BACK', `❌ Back camera photo upload failed: ${uploadError}`);
          }
          
          backCaptured = true;
        } catch (error) {
          logCameraRequest('CAPTURE-BACK', `❌ Back camera capture failed: ${error}`);
        }
      } else {
        logCameraRequest('CAPTURE-BACK', `⚠️ Back camera capture skipped (no ref)`);
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
  if (!hasPermission?.granted) return <Text>No access to camera</Text>;

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
});

VideoRecorder.displayName = 'VideoRecorder';

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

export default VideoRecorder;
