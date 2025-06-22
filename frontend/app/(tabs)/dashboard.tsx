import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <ThemedText type="title" style={styles.title}>
          Personal Dashboard
        </ThemedText>
        <TouchableOpacity style={styles.accountButton}>
          <Ionicons name="person" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sentiment Graph Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Sentiment Graph
          </ThemedText>
          <View style={styles.sectionContent}>
            <View style={styles.placeholder}>
              <Ionicons name="analytics-outline" size={48} color="#8E8E93" />
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
                <Ionicons name="location-outline" size={20} color="#007AFF" />
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  accountButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.6,
  },
  pathCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
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
  },
  pathDetails: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  pathMood: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  promptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  promptText: {
    fontSize: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  promptTime: {
    fontSize: 12,
    opacity: 0.6,
  },
}); 