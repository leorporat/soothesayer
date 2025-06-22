import React, { useEffect, useRef, useState } from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

export default function VideoRecorder() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const frontCameraRef = useRef<CameraView>(null);
  const backCameraRef = useRef<CameraView>(null);
  const [recording, setRecording] = useState(false);
  const [frameCapturing, setFrameCapturing] = useState(false);
  const frameIntervalRef = useRef<number | null>(null);
  const recordingRef = useRef(false); // Ref to track recording state

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      console.log('hasPermission', status);
    })();
  }, []);

  // Send frames to backend for analysis (not connected yet)
  const sendFrontFrameToBackend = async (imageUri: string) => {
    // TODO: Connect to face-sentiment endpoint later
    console.log('😊 Front camera frame ready for face analysis:', imageUri);
  };

  const sendBackFrameToBackend = async (imageUri: string) => {
    // TODO: Connect to environment-sentiment endpoint later
    console.log('🌍 Back camera frame ready for environment analysis:', imageUri);
  };

  // Capture frames from both cameras during recording
  const captureFrames = async () => {
    console.log('🔍 captureFrames called - recording state:', recordingRef.current);
    if (recordingRef.current) {
      console.log('🎬 === DUAL CAMERA CAPTURE STARTING ===');
      const timestamp = new Date().toLocaleTimeString();
      console.log(`⏰ Capture timestamp: ${timestamp}`);
      
      let frontCaptured = false;
      let backCaptured = false;

      // Capture from front camera (face analysis)
      console.log('🔍 Front camera ref exists:', !!frontCameraRef.current);
      if (frontCameraRef.current) {
        try {
          console.log('🔍 Attempting front camera takePictureAsync...');
          const frontPhoto = await frontCameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: false,
          });
          console.log('📸✅ Front camera frame captured successfully');
          console.log(`😊 Front frame URI: ${frontPhoto.uri}`);
          await sendFrontFrameToBackend(frontPhoto.uri);
          frontCaptured = true;
        } catch (error) {
          console.error('❌ Error capturing front frame:', error);
        }
      } else {
        console.log('⚠️ Front camera ref not available');
      }

      // Capture from back camera (environment analysis)
      console.log('🔍 Back camera ref exists:', !!backCameraRef.current);
      if (backCameraRef.current) {
        try {
          console.log('🔍 Attempting back camera takePictureAsync...');
          const backPhoto = await backCameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: false,
          });
          console.log('📸✅ Back camera frame captured successfully');
          console.log(`🌍 Back frame URI: ${backPhoto.uri}`);
          await sendBackFrameToBackend(backPhoto.uri);
          backCaptured = true;
        } catch (error) {
          console.error('❌ Error capturing back frame:', error);
        }
      } else {
        console.log('⚠️ Back camera ref not available');
      }

      // Summary log
      console.log(`📊 Capture summary: Front=${frontCaptured ? '✅' : '❌'}, Back=${backCaptured ? '✅' : '❌'}`);
      console.log('🎬 === DUAL CAMERA CAPTURE COMPLETE ===\n');
    }
  };

  // Start frame capture interval
  const startFrameCapture = () => {
    setFrameCapturing(true);
    // Capture frames every 2 seconds during recording
    frameIntervalRef.current = setInterval(captureFrames, 2000);
    console.log('🎯 Dual camera frame capture started (every 2 seconds)');
  };

  // Stop frame capture interval
  const stopFrameCapture = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
      setFrameCapturing(false);
      console.log('🎯 Frame capture stopped');
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainCamera: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    alignSelf: 'center',
  },
  frontCamera: {
    position: 'absolute',
    top: 30,
    right: 20,
    width: 120,
    height: 180,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#00ff00',
    backgroundColor: '#000',
    zIndex: 10,
  },
  button: {
    marginTop: 20,
  },
});
