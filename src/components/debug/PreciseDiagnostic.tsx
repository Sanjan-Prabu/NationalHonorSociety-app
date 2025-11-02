import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'react-native';

/**
 * PRECISE DIAGNOSTIC - Find the exact error
 */
const PreciseDiagnostic: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('Starting...');

  const log = (message: string) => {
    console.log(`[DIAGNOSTIC] ${message}`);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDiagnostic = async () => {
    setResults([]);
    log('🔍 STARTING PRECISE DIAGNOSTIC');
    
    // Test 1: Basic React Native Image component
    setCurrentTest('Testing React Native Image component...');
    log('TEST 1: React Native Image component');
    
    try {
      // Test with a simple, known working image
      const testImageUrl = 'https://picsum.photos/100/100';
      log(`Testing with external image: ${testImageUrl}`);
      
      const imageLoadPromise = new Promise((resolve, reject) => {
        const testImage = new Image();
        // @ts-ignore
        testImage.onload = () => {
          log('✅ External image loads in web context');
          resolve('success');
        };
        // @ts-ignore
        testImage.onerror = () => {
          log('❌ External image fails in web context');
          reject('failed');
        };
        // @ts-ignore
        testImage.src = testImageUrl;
        
        // Timeout after 5 seconds
        setTimeout(() => {
          log('⏰ External image test timed out');
          reject('timeout');
        }, 5000);
      });
      
      await imageLoadPromise;
    } catch (error) {
      log(`❌ External image test failed: ${error}`);
    }

    // Test 2: Network connectivity to R2
    setCurrentTest('Testing R2 network connectivity...');
    log('TEST 2: R2 Network connectivity');
    
    const r2Url = 'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/proof-images/550e8400-e29b-41d4-a716-446655440003/1761710788808-g1itlq.jpg';
    
    try {
      log(`Testing R2 URL: ${r2Url.substring(0, 60)}...`);
      
      const response = await fetch(r2Url, { 
        method: 'HEAD',
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'NHS-App/1.0'
        }
      });
      
      log(`R2 Response Status: ${response.status} ${response.statusText}`);
      log(`R2 Content-Type: ${response.headers.get('content-type')}`);
      log(`R2 Content-Length: ${response.headers.get('content-length')}`);
      
      if (response.ok) {
        log('✅ R2 URL is accessible via fetch');
      } else {
        log(`❌ R2 URL returned error: ${response.status}`);
      }
    } catch (error) {
      log(`❌ R2 fetch failed: ${error instanceof Error ? error.message : error}`);
    }

    // Test 3: React Native Image with R2 URL
    setCurrentTest('Testing React Native Image with R2 URL...');
    log('TEST 3: React Native Image with R2 URL');
    
    // This will be handled by the Image component below

    // Test 4: Check if images exist in database
    setCurrentTest('Checking database for image URLs...');
    log('TEST 4: Database image URLs');
    
    // We'll add this check
    log('Database check would require Supabase connection');

    // Test 5: Platform-specific issues
    setCurrentTest('Checking platform-specific issues...');
    log('TEST 5: Platform checks');
    
    log(`Platform: ${require('react-native').Platform.OS}`);
    log(`Platform Version: ${require('react-native').Platform.Version}`);
    
    setCurrentTest('Diagnostic complete - check results');
    log('🎯 DIAGNOSTIC COMPLETE - CHECK RESULTS ABOVE');
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 PRECISE DIAGNOSTIC</Text>
      <Text style={styles.currentTest}>{currentTest}</Text>
      
      <TouchableOpacity style={styles.button} onPress={runDiagnostic}>
        <Text style={styles.buttonText}>Run Diagnostic Again</Text>
      </TouchableOpacity>

      {/* Test Image Components */}
      <View style={styles.imageTests}>
        <Text style={styles.sectionTitle}>IMAGE LOAD TESTS:</Text>
        
        {/* Test 1: External image */}
        <View style={styles.imageTest}>
          <Text style={styles.imageLabel}>External Test Image:</Text>
          <Image
            source={{ uri: 'https://picsum.photos/100/100' }}
            style={styles.testImage}
            onLoadStart={() => log('🔄 External image load started')}
            onLoad={() => log('✅ External image loaded successfully')}
            onError={(error) => log(`❌ External image failed: ${JSON.stringify(error.nativeEvent)}`)}
          />
        </View>

        {/* Test 2: R2 image */}
        <View style={styles.imageTest}>
          <Text style={styles.imageLabel}>R2 Test Image:</Text>
          <Image
            source={{ uri: 'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/proof-images/550e8400-e29b-41d4-a716-446655440003/1761710788808-g1itlq.jpg' }}
            style={styles.testImage}
            onLoadStart={() => log('🔄 R2 image load started')}
            onLoad={() => log('✅ R2 image loaded successfully')}
            onError={(error) => log(`❌ R2 image failed: ${JSON.stringify(error.nativeEvent)}`)}
          />
        </View>

        {/* Test 3: R2 image with cache busting */}
        <View style={styles.imageTest}>
          <Text style={styles.imageLabel}>R2 Image (Cache Busted):</Text>
          <Image
            source={{ 
              uri: `https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/proof-images/550e8400-e29b-41d4-a716-446655440003/1761710788808-g1itlq.jpg?t=${Date.now()}`
            }}
            style={styles.testImage}
            onLoadStart={() => log('🔄 R2 cache-busted image load started')}
            onLoad={() => log('✅ R2 cache-busted image loaded successfully')}
            onError={(error) => log(`❌ R2 cache-busted image failed: ${JSON.stringify(error.nativeEvent)}`)}
          />
        </View>
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>DIAGNOSTIC RESULTS:</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>{result}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#ff0000',
    margin: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#ff0000',
  },
  currentTest: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  imageTests: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  imageTest: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  imageLabel: {
    fontSize: 12,
    flex: 1,
    color: '#666',
  },
  testImage: {
    width: 50,
    height: 50,
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    maxHeight: 300,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 11,
    marginBottom: 3,
    color: '#333',
    fontFamily: 'monospace',
  },
});

export default PreciseDiagnostic;