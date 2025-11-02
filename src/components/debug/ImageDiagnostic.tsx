import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

/**
 * Comprehensive image diagnostic component
 */
const ImageDiagnostic: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  
  // Test URLs - your exact URL and a few others
  const testUrls = [
    'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/proof-images/550e8400-e29b-41d4-a716-446655440003/1761710788808-g1itlq.jpg',
    'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/announcements/550e8400-e29b-41d4-a716-446655440003/1761705387911-81qlmc.jpg',
    'https://picsum.photos/200/200', // External test image
  ];

  const updateResult = (url: string, result: string) => {
    setTestResults(prev => ({ ...prev, [url]: result }));
  };

  const testNetworkFetch = async () => {
    console.log('🔍 Testing network fetch...');
    
    for (const url of testUrls) {
      try {
        console.log(`Testing fetch for: ${url}`);
        const response = await fetch(url, { method: 'HEAD' });
        console.log(`Fetch result: ${response.status} ${response.statusText}`);
        updateResult(url, `Fetch: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        updateResult(url, `Fetch Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  };

  const clearImageCache = () => {
    console.log('🗑️ Attempting to clear image cache...');
    // Force re-render with timestamp
    setTestResults({});
  };

  useEffect(() => {
    testNetworkFetch();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 IMAGE DIAGNOSTIC</Text>
      
      <TouchableOpacity style={styles.button} onPress={testNetworkFetch}>
        <Text style={styles.buttonText}>Test Network Fetch</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={clearImageCache}>
        <Text style={styles.buttonText}>Clear Cache & Retry</Text>
      </TouchableOpacity>

      {testUrls.map((url, index) => {
        const shortUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
        const result = testResults[url] || 'Testing...';
        const timestamp = Date.now();
        
        return (
          <View key={index} style={styles.testItem}>
            <Text style={styles.urlText}>{shortUrl}</Text>
            <Text style={styles.resultText}>{result}</Text>
            
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: `${url}?t=${timestamp}` }}
                style={styles.testImage}
                resizeMode="cover"
                onLoadStart={() => {
                  console.log(`🔄 Image load started: ${url}`);
                  updateResult(url, 'Image: Loading...');
                }}
                onLoad={() => {
                  console.log(`✅ Image loaded successfully: ${url}`);
                  updateResult(url, 'Image: ✅ LOADED');
                }}
                onError={(error) => {
                  console.error(`❌ Image load error: ${url}`, error);
                  updateResult(url, `Image: ❌ ERROR - ${JSON.stringify(error.nativeEvent)}`);
                }}
              />
              
              {result.includes('LOADED') && (
                <View style={styles.successBadge}>
                  <Text style={styles.badgeText}>✅</Text>
                </View>
              )}
              
              {result.includes('ERROR') && (
                <View style={styles.errorBadge}>
                  <Text style={styles.badgeText}>❌</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
      
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Diagnostic Info:</Text>
        <Text style={styles.infoText}>• Network fetch tests URL accessibility</Text>
        <Text style={styles.infoText}>• Image load tests React Native Image component</Text>
        <Text style={styles.infoText}>• Cache busting adds timestamp to URLs</Text>
        <Text style={styles.infoText}>• Check console for detailed logs</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#ff0000',
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#ff0000',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  testItem: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  urlText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    height: 100,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
  },
  testImage: {
    width: '100%',
    height: '100%',
  },
  successBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});

export default ImageDiagnostic;