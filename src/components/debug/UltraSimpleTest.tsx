import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

/**
 * Ultra simple test - hardcoded working URL
 */
const UltraSimpleTest: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ULTRA SIMPLE TEST</Text>
      <Image
        source={{ uri: 'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/announcements/550e8400-e29b-41d4-a716-446655440003/1761705387911-81qlmc.jpg' }}
        style={styles.image}
        resizeMode="cover"
      />
      <Text style={styles.caption}>Hardcoded working URL</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#ffff00',
    margin: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 100,
    backgroundColor: '#ccc',
  },
  caption: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
});

export default UltraSimpleTest;