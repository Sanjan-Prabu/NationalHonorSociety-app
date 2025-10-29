import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import optimized components
import LazyImage from '../components/ui/LazyImage';
import UploadProgressIndicator from '../components/ui/UploadProgressIndicator';
import OptimizedImageList from '../components/ui/OptimizedImageList';
import ImagePicker from '../components/ui/ImagePicker';
import { usePresignedUrl } from '../hooks/usePresignedUrl';
import ImagePerformanceMonitor from '../utils/imagePerformanceMonitor';

const Colors = {
  white: '#FFFFFF',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  lightGray: '#F7FAFC',
  successGreen: '#38A169',
};

interface ExampleImageItem {
  id: string;
  imagePath?: string;
  imageUrl?: string;
  title: string;
  description?: string;
  isPrivate?: boolean;
}

/**
 * Example component demonstrating all performance optimizations for the R2 image system
 */
const PerformanceOptimizedImageExample: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [performanceStats, setPerformanceStats] = useState<any>(null);

  const { getCacheStats, cleanupExpiredUrls } = usePresignedUrl();
  const performanceMonitor = ImagePerformanceMonitor.getInstance();

  // Sample image data for demonstration
  const sampleImages: ExampleImageItem[] = [
    {
      id: '1',
      imageUrl: 'https://picsum.photos/400/300?random=1',
      title: 'Public Announcement Image',
      description: 'This is a public image loaded directly from R2',
      isPrivate: false,
    },
    {
      id: '2',
      imagePath: 'volunteer-hours/org123/user456/1699234567890-abc123.jpg',
      title: 'Private Volunteer Hour Image',
      description: 'This requires presigned URL generation',
      isPrivate: true,
    },
    {
      id: '3',
      imageUrl: 'https://picsum.photos/400/300?random=2',
      title: 'Event Image',
      description: 'Another public image with lazy loading',
      isPrivate: false,
    },
    {
      id: '4',
      imagePath: 'volunteer-hours/org123/user789/1699234567891-def456.jpg',
      title: 'Another Private Image',
      description: 'Demonstrates batch URL generation',
      isPrivate: true,
    },
  ];

  // Handle image selection with progress tracking
  const handleImageSelected = useCallback((imageUri: string) => {
    setSelectedImage(imageUri);
    setUploadStatus('success');
  }, []);

  const handleImageRemoved = useCallback(() => {
    setSelectedImage(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  }, []);

  const handleUploadProgress = useCallback((progress: number) => {
    setUploadProgress(progress);
    if (progress === 100) {
      setUploadStatus('success');
    }
  }, []);

  // Render optimized image list item
  const renderImageItem = useCallback((item: ExampleImageItem, imageUrl?: string) => {
    return (
      <View key={item.id} style={styles.imageItem}>
        <View style={styles.imageContainer}>
          {imageUrl || item.imageUrl ? (
            <LazyImage
              source={{ uri: imageUrl || item.imageUrl! }}
              containerStyle={styles.itemImage}
              imageStyle={styles.itemImage}
              enableFadeIn={true}
              fadeInDuration={300}
              enableProgressiveLoading={true}
              onLoadStart={() => {
                console.log(`Started loading image: ${item.title}`);
              }}
              onLoadEnd={() => {
                console.log(`Finished loading image: ${item.title}`);
                performanceMonitor.trackLazyLoad(
                  imageUrl || item.imageUrl!,
                  Math.random() * 1000 + 500, // Simulated load time
                  true
                );
              }}
              onError={(error) => {
                console.error(`Failed to load image: ${item.title}`, error);
                performanceMonitor.trackLazyLoad(
                  imageUrl || item.imageUrl!,
                  0,
                  false
                );
              }}
            />
          ) : (
            <View style={[styles.itemImage, styles.placeholderImage]}>
              <Icon name="image" size={moderateScale(32)} color={Colors.textLight} />
              <Text style={styles.placeholderText}>Loading...</Text>
            </View>
          )}
        </View>
        
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}
          <View style={styles.itemMeta}>
            <Icon 
              name={item.isPrivate ? 'lock' : 'public'} 
              size={moderateScale(14)} 
              color={item.isPrivate ? Colors.textMedium : Colors.successGreen} 
            />
            <Text style={styles.itemMetaText}>
              {item.isPrivate ? 'Private (Presigned URL)' : 'Public (Direct URL)'}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [performanceMonitor]);

  // Get performance statistics
  const updatePerformanceStats = useCallback(() => {
    const cacheStats = getCacheStats();
    const performanceReport = performanceMonitor.getPerformanceReport();
    
    setPerformanceStats({
      cache: cacheStats,
      performance: performanceReport,
    });
  }, [getCacheStats, performanceMonitor]);

  // Cleanup expired URLs
  const handleCleanupCache = useCallback(() => {
    const cleanedCount = cleanupExpiredUrls();
    Alert.alert(
      'Cache Cleanup',
      `Cleaned up ${cleanedCount} expired URLs from cache.`,
      [{ text: 'OK' }]
    );
    updatePerformanceStats();
  }, [cleanupExpiredUrls, updatePerformanceStats]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(updatePerformanceStats, 5000);
    return () => clearInterval(interval);
  }, [updatePerformanceStats]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Performance Optimized Images</Text>
        <Text style={styles.subtitle}>
          Demonstrating lazy loading, caching, and progress tracking
        </Text>
      </View>

      {/* Image Upload Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enhanced Image Picker</Text>
        <Text style={styles.sectionDescription}>
          Features progress tracking, lazy loading, and network awareness
        </Text>
        
        <ImagePicker
          onImageSelected={handleImageSelected}
          onImageRemoved={handleImageRemoved}
          onUploadProgress={handleUploadProgress}
          selectedImage={selectedImage || undefined}
          showProgressIndicator={true}
          enableLazyLoading={true}
          showSuccessIndicator={true}
          placeholder="Select Image with Progress Tracking"
        />

        {/* Upload Progress Demo */}
        {uploadStatus !== 'idle' && (
          <UploadProgressIndicator
            progress={uploadProgress}
            status={uploadStatus}
            size="medium"
            showPercentage={true}
            showIcon={true}
            animated={true}
          />
        )}
      </View>

      {/* Optimized Image List Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Optimized Image List</Text>
        <Text style={styles.sectionDescription}>
          Batch presigned URL generation and lazy loading for lists
        </Text>
        
        <OptimizedImageList
          data={sampleImages as any}
          renderItem={renderImageItem as any}
          enableBatchLoading={true}
          batchSize={5}
          preloadDistance={2}
          style={styles.imageList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Performance Statistics Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance Statistics</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={updatePerformanceStats}
          >
            <Icon name="refresh" size={moderateScale(20)} color={Colors.primaryBlue} />
          </TouchableOpacity>
        </View>
        
        {performanceStats && (
          <View style={styles.statsContainer}>
            {/* Cache Statistics */}
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Cache Performance</Text>
              <Text style={styles.statText}>
                Hit Rate: {(performanceStats.cache.hitRate * 100).toFixed(1)}%
              </Text>
              <Text style={styles.statText}>
                Total Requests: {performanceStats.cache.totalRequests}
              </Text>
              <Text style={styles.statText}>
                Cache Size: {performanceStats.cache.cacheSize}
              </Text>
              <Text style={styles.statText}>
                Avg Response: {performanceStats.cache.averageResponseTime.toFixed(1)}ms
              </Text>
            </View>

            {/* Upload Statistics */}
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Upload Performance</Text>
              <Text style={styles.statText}>
                Success Rate: {(performanceStats.performance.uploads.successRate * 100).toFixed(1)}%
              </Text>
              <Text style={styles.statText}>
                Total Uploads: {performanceStats.performance.uploads.totalUploads}
              </Text>
              <Text style={styles.statText}>
                Avg Time: {performanceStats.performance.uploads.averageUploadTime.toFixed(0)}ms
              </Text>
              <Text style={styles.statText}>
                Avg Size: {(performanceStats.performance.uploads.averageFileSize / 1024).toFixed(1)}KB
              </Text>
            </View>

            {/* Lazy Loading Statistics */}
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Lazy Loading</Text>
              <Text style={styles.statText}>
                Success Rate: {(performanceStats.performance.lazyLoading.successRate * 100).toFixed(1)}%
              </Text>
              <Text style={styles.statText}>
                Total Loads: {performanceStats.performance.lazyLoading.totalLoads}
              </Text>
              <Text style={styles.statText}>
                Avg Load Time: {performanceStats.performance.lazyLoading.averageLoadTime.toFixed(0)}ms
              </Text>
            </View>
          </View>
        )}

        {/* Cache Management */}
        <TouchableOpacity
          style={styles.cleanupButton}
          onPress={handleCleanupCache}
        >
          <Icon name="cleaning-services" size={moderateScale(16)} color={Colors.white} />
          <Text style={styles.cleanupButtonText}>Cleanup Expired Cache</Text>
        </TouchableOpacity>
      </View>

      {/* Performance Tips Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Features</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Icon name="speed" size={moderateScale(20)} color={Colors.successGreen} />
            <Text style={styles.featureText}>Lazy loading with fade-in animations</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="cached" size={moderateScale(20)} color={Colors.successGreen} />
            <Text style={styles.featureText}>1-hour presigned URL caching</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="batch-prediction" size={moderateScale(20)} color={Colors.successGreen} />
            <Text style={styles.featureText}>Batch presigned URL generation</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="trending-up" size={moderateScale(20)} color={Colors.successGreen} />
            <Text style={styles.featureText}>Real-time progress tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="analytics" size={moderateScale(20)} color={Colors.successGreen} />
            <Text style={styles.featureText}>Performance monitoring</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  header: {
    padding: scale(20),
    backgroundColor: Colors.white,
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
  },
  section: {
    backgroundColor: Colors.white,
    marginBottom: verticalScale(16),
    padding: scale(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  sectionDescription: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(16),
    lineHeight: moderateScale(20),
  },
  refreshButton: {
    padding: scale(8),
  },
  imageList: {
    maxHeight: verticalScale(400),
  },
  imageItem: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    borderRadius: moderateScale(8),
    padding: scale(12),
    marginBottom: verticalScale(12),
  },
  imageContainer: {
    marginRight: scale(12),
  },
  itemImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.lightGray,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: moderateScale(10),
    color: Colors.textLight,
    marginTop: verticalScale(4),
  },
  itemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  itemDescription: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    lineHeight: moderateScale(16),
    marginBottom: verticalScale(8),
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemMetaText: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    marginLeft: scale(4),
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  statCard: {
    flex: 1,
    minWidth: scale(100),
    backgroundColor: Colors.lightGray,
    borderRadius: moderateScale(8),
    padding: scale(12),
  },
  statTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  statText: {
    fontSize: moderateScale(11),
    color: Colors.textMedium,
    marginBottom: verticalScale(2),
  },
  cleanupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    marginTop: verticalScale(16),
  },
  cleanupButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: Colors.white,
    marginLeft: scale(8),
  },
  featureList: {
    gap: verticalScale(12),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginLeft: scale(12),
  },
});

export default PerformanceOptimizedImageExample;