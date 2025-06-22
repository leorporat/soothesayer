import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import VideoRecorder from '@/components/Camera';

export default function HomeScreen() {
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);

  const handleSliderPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const sliderWidth = 300;
    const percentage = Math.max(0, Math.min(100, (locationX / sliderWidth) * 100));
    setSliderValue(Math.round(percentage));
  };

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
            onPress={() => setIsRecordingAudio(!isRecordingAudio)}
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
            style={[styles.recordButton, styles.videoButton]}
            onPress={() => {}}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrapper}>
              <IconSymbol name="video.fill" size={32} color="white" />
            </View>
            <ThemedText style={styles.buttonText}>
              Record Video
            </ThemedText>
          </TouchableOpacity>
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
    marginBottom: 40,
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
