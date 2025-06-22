import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      // Fetch latest audio analysis
      const audioResponse = await fetch('http://localhost:5001/api/audio/latest');
      if (audioResponse.ok) {
        const audioData = await audioResponse.json();
        setLastAnalysis(audioData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <ThemedText type="title" style={styles.title}>
          Personal Dashboard
        </ThemedText>
        <TouchableOpacity style={styles.accountButton}>
          <Ionicons name="person" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
        />
      }>
        {/* Sentiment Graph Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Sentiment Graph
          </ThemedText>
          <View style={styles.sectionContent}>
            <View style={styles.placeholder}>
              <Ionicons name="analytics-outline" size={48} color="#3b82f6" />
              <ThemedText style={styles.placeholderText}>
                Your mood trends will appear here
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Last Path Walked Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Last Path Walked
          </ThemedText>
          <View style={styles.sectionContent}>
            <View style={styles.pathCard}>
              <View style={styles.pathHeader}>
                <Ionicons name="location-outline" size={20} color="#3b82f6" />
                <ThemedText style={styles.pathTitle}>Central Park Loop</ThemedText>
              </View>
              <ThemedText style={styles.pathDetails}>
                Distance: 2.3 miles • Duration: 45 min
              </ThemedText>
              <ThemedText style={styles.pathMood}>
                Mood: Calm and Refreshed
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Previous Prompts Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Previous Prompts Asked
          </ThemedText>
          <View style={styles.sectionContent}>
            <View style={styles.promptCard}>
              <ThemedText style={styles.promptText}>
                &ldquo;How am I feeling right now?&rdquo;
              </ThemedText>
              <ThemedText style={styles.promptTime}>2 hours ago</ThemedText>
            </View>
            <View style={styles.promptCard}>
              <ThemedText style={styles.promptText}>
                &ldquo;What&apos;s my current emotional state?&rdquo;
              </ThemedText>
              <ThemedText style={styles.promptTime}>Yesterday</ThemedText>
            </View>
            <View style={styles.promptCard}>
              <ThemedText style={styles.promptText}>
                &ldquo;Analyze my mood and environment&rdquo;
              </ThemedText>
              <ThemedText style={styles.promptTime}>3 days ago</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  headerLeft: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  accountButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#fff',
  },
  sectionContent: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#bfdbfe',
    opacity: 0.8,
  },
  pathCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pathTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pathDetails: {
    fontSize: 14,
    color: '#bfdbfe',
    opacity: 0.7,
    marginBottom: 4,
  },
  pathMood: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  promptCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  promptText: {
    fontSize: 16,
    marginBottom: 8,
    fontStyle: 'italic',
    color: '#fff',
  },
  promptTime: {
    fontSize: 12,
    color: '#bfdbfe',
    opacity: 0.6,
  },
}); 