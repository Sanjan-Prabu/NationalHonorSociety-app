import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

/**
 * Super simple image test - just load one known working image
 */
const SuperSimpleImageTest: React.FC = () => {
  // This URL was confirmed working in our tests
  const testUrl = 'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/announcements/550e8400-e29b-41d4-a716-446655440003/1761705387911-81qlmc.jpg';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SIMPLE IMAGE TEST</Text>
      <Text style={styles.url}>URL: {testUrl.substring(0, 50)}...</Text>
      
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: testUrl }}
          style={styles.image}
          resizeMode="cover"
          onLoadStart={() => {
            console.log('🔄 SIMPLE TEST: Image load started');
          }}
          onLoad={() => {
            console.log('✅ SIMPLE TEST: Image loaded successfully!');
          }}
          onError={(error) => {
            console.error('❌ SIMPLE TEST: Image failed to load:', error);
          }}
        />
      </View>
      
      <Text style={styles.instruction}>
        Check console for load status
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff0000',
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff0000',
    textAlign: 'center',
    marginBottom: 10,
  },
  url: {
    fontSize: 10,
    color: '#666',
    marginBottom: 10,
  },
  imageContainer: {
    height: 150,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  instruction: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default SuperSimpleImageTest;