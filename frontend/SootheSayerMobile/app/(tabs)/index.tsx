import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import VideoRecorder from '@/components/Camera';

export default function HomeScreen() {
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isIntervalRecordingOn, setIsIntervalRecordingOn] = useState(false);
  const [recordedAudios, setRecordedAudios] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Request audio permissions on component mount
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    })();
  }, []);

  // Handle interval audio recording
  useEffect(() => {
    if (isIntervalRecordingOn && hasPermission) {
      // Start recording audio every 15 seconds
      intervalRef.current = setInterval(async () => {
        try {
          console.log('Starting interval audio recording...');
          await startRecording();
          
          // Stop recording after 10 seconds (to create 10-second clips)
          setTimeout(async () => {
            await stopRecording();
          }, 10000);
          
        } catch (error) {
          console.error('Error in interval recording:', error);
        }
      }, 15000); // 15 seconds between recordings
    } else {
      // Clear interval when turned off
      if (intervalRef.current) {
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
  }, [isIntervalRecordingOn, hasPermission]);

  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  // const sendAudioToBackend = async (audioUri: string) => {
  //   try {
  //     console.log('Sending audio to backend:', audioUri);
      
  //     // Create form data for file upload
  //     const formData = new FormData();
  //     formData.append('audio', {
  //       uri: audioUri,
  //       type: 'audio/m4a',
  //       name: `audio_${Date.now()}.m4a`
  //     } as any);
      
  //     // Add any additional metadata
  //     formData.append('timestamp', Date.now().toString());
  //     formData.append('duration', '10'); // 10 seconds for interval recordings
      
  //     // Send to your backend endpoint
  //     const response = await fetch('YOUR_BACKEND_URL/api/audio/upload', {
  //       method: 'POST',
  //       body: formData,
  //       headers: {
  //         'Content-Type': 'multipart/form-data',
  //         // Add any authentication headers if needed
  //         // 'Authorization': 'Bearer YOUR_TOKEN'
  //       },
  //     });
      
  //     if (response.ok) {
  //       console.log('Audio sent successfully');
  //       const result = await response.json();
  //       console.log('Backend response:', result);
  //     } else {
  //       console.error('Failed to send audio:', response.status);
  //     }
  //   } catch (error) {
  //     console.error('Error sending audio to backend:', error);
  //   }
  // };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      console.log('Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        // Convert to MP3 format (this is a simplified approach)
        const fileName = `audio_${Date.now()}.m4a`; // Using m4a as it's widely supported
        const newUri = `${FileSystem.documentDirectory}${fileName}`;
        
        // Copy the file to our documents directory
        await FileSystem.copyAsync({
          from: uri,
          to: newUri
        });
        
        setRecordedAudios(prev => [...prev, newUri]);
        console.log('Audio saved:', newUri);
        
        // Send the audio to your backend
        // await sendAudioToBackend(newUri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
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

    if (isRecordingAudio) {
      await stopRecording();
      setIsRecordingAudio(false);
    } else {
      await startRecording();
      setIsRecordingAudio(true);
    }
  };

  const toggleIntervalRecording = () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
      return;
    }
    setIsIntervalRecordingOn(!isIntervalRecordingOn);
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
        <VideoRecorder />
      </View>

      {/* Recording Buttons - Below Camera */}
      <View style={styles.buttonContainer}>
        {/* Square Record Buttons with Beautiful Styling */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecordingAudio ? styles.recordingButton : styles.voiceButton
            ]}
            onPress={toggleManualRecording}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrapper}>
              <IconSymbol 
                name={isRecordingAudio ? "stop.fill" : "mic.fill"} 
                size={32} 
                color="white" 
              />
            </View>
            <ThemedText style={styles.buttonText}>
              {isRecordingAudio ? 'Stop\nVoice' : 'Record\nVoice'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recordButton, 
              isIntervalRecordingOn ? styles.recordingButton : styles.videoButton
            ]}
            onPress={toggleIntervalRecording}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrapper}>
              <IconSymbol 
                name={isIntervalRecordingOn ? "stop.fill" : "video.fill"} 
                size={32} 
                color="white" 
              />
            </View>
            <ThemedText style={styles.buttonText}>
              {isIntervalRecordingOn ? 'Stop\nAuto-Record' : 'Start\nAuto-Record'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Audio Status Display */}
        <View style={styles.audioStatusContainer}>
          <ThemedText style={styles.audioStatusText}>
            {isIntervalRecordingOn 
              ? `Auto-recording every 15s (${recordedAudios.length} files)` 
              : `Recorded: ${recordedAudios.length} files`
            }
          </ThemedText>
        </View>

        {/* Beautiful Slider Meter */}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    marginBottom: 20,
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
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
