import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { fixImageUrl } from '../../utils/imageUrlFixer';

/**
 * Simple test component to verify image loading
 */
const ImageLoadTest: React.FC = () => {
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  // Test URLs from database
  const testUrls = [
    'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/announcements/550e8400-e29b-41d4-a716-446655440003/1761705387911-81qlmc.jpg',
    'https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/announcements/550e8400-e29b-41d4-a716-446655440003/1761705387911-81qlmc.jpg'
  ];

  const handleImageLoad = (url: string) => {
    console.log('✅ Image loaded successfully:', url);
    setLoadedImages(prev => [...prev, url]);
  };

  const handleImageError = (url: string, error: any) => {
    console.error('❌ Image failed to load:', url, error);
    setFailedImages(prev => [...prev, url]);
  };

  const resetTest = () => {
    setLoadedImages([]);
    setFailedImages([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Image Load Test</Text>
      
      <TouchableOpacity style={styles.resetButton} onPress={resetTest}>
        <Text style={styles.resetButtonText}>Reset Test</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Test Images:</Text>
      
      {testUrls.map((url, index) => {
        const fixedUrl = fixImageUrl(url);
        const isLoaded = loadedImages.includes(fixedUrl);
        const isFailed = failedImages.includes(fixedUrl);
        
        return (
          <View key={index} style={styles.testItem}>
            <Text style={styles.urlText}>Original: {url.substring(0, 60)}...</Text>
            <Text style={styles.urlText}>Fixed: {fixedUrl.substring(0, 60)}...</Text>
            
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: fixedUrl }}
                style={styles.testImage}
                resizeMode="cover"
                onLoad={() => handleImageLoad(fixedUrl)}
                onError={(error) => handleImageError(fixedUrl, error)}
              />
              
              {isLoaded && (
                <View style={styles.successOverlay}>
                  <Text style={styles.successText}>✅ LOADED</Text>
                </View>
              )}
              
              {isFailed && (
                <View style={styles.errorOverlay}>
                  <Text style={styles.errorText}>❌ FAILED</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.results}>
        <Text style={styles.resultsTitle}>Results:</Text>
        <Text style={styles.resultsText}>✅ Loaded: {loadedImages.length}</Text>
        <Text style={styles.resultsText}>❌ Failed: {failedImages.length}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  resetButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  testItem: {
    marginBottom: 30,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  urlText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
  },
  testImage: {
    width: '100%',
    height: '100%',
  },
  successOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    padding: 5,
    borderRadius: 3,
  },
  successText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 5,
    borderRadius: 3,
  },
  errorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  results: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultsText: {
    fontSize: 14,
    marginBottom: 5,
  },
});

export default ImageLoadTest;