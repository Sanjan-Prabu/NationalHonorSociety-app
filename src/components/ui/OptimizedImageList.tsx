import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  ViewToken,
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import LazyImage from './LazyImage';
import { usePresignedUrl } from '../../hooks/usePresignedUrl';

const Colors = {
  white: '#FFFFFF',
  textLight: '#718096',
  lightGray: '#F7FAFC',
  primaryBlue: '#4A90E2',
};

interface ImageItem {
  id: string;
  imagePath?: string;
  imageUrl?: string;
  title?: string;
  description?: string;
  isPrivate?: boolean;
}

interface OptimizedImageListProps {
  data: ImageItem[];
  renderItem: (item: ImageItem, imageUrl?: string) => React.ReactElement;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  numColumns?: number;
  horizontal?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  contentContainerStyle?: any;
  style?: any;
  keyExtractor?: (item: ImageItem) => string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  enableBatchLoading?: boolean;
  batchSize?: number;
  preloadDistance?: number;
}

/**
 * Optimized image list component with lazy loading and batch presigned URL generation
 * Provides efficient rendering for lists containing images
 */
const OptimizedImageList: React.FC<OptimizedImageListProps> = ({
  data,
  renderItem,
  onRefresh,
  refreshing = false,
  numColumns = 1,
  horizontal = false,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
  contentContainerStyle,
  style,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold = 0.1,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  enableBatchLoading = true,
  batchSize = 10,
  preloadDistance = 5,
}) => {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Map<string, string>>(new Map());
  const [loadingBatch, setLoadingBatch] = useState(false);

  const { batchGenerateUrls, loading: urlLoading, error } = usePresignedUrl();

  // Extract private image paths that need presigned URLs
  const privateImagePaths = useMemo(() => {
    return data
      .filter(item => item.isPrivate && item.imagePath)
      .map(item => item.imagePath!)
      .filter(path => !loadedImages.has(path));
  }, [data, loadedImages]);

  // Batch load presigned URLs for visible private images
  const loadPresignedUrls = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;

    try {
      setLoadingBatch(true);
      const urlMap = await batchGenerateUrls(paths);

      setLoadedImages(prev => {
        const newMap = new Map(prev);
        urlMap.forEach((url, path) => {
          newMap.set(path, url);
        });
        return newMap;
      });
    } catch (error) {
      console.error('Failed to load presigned URLs:', error);
    } finally {
      setLoadingBatch(false);
    }
  }, [batchGenerateUrls]);

  // Load initial batch of presigned URLs
  useEffect(() => {
    if (enableBatchLoading && privateImagePaths.length > 0) {
      const initialBatch = privateImagePaths.slice(0, batchSize);
      loadPresignedUrls(initialBatch);
    }
  }, [privateImagePaths, enableBatchLoading, batchSize, loadPresignedUrls]);

  // Handle viewability changes for progressive loading
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const newVisibleItems = new Set<string>();
    const pathsToLoad: string[] = [];

    viewableItems.forEach(({ item }) => {
      const imageItem = item as ImageItem;
      newVisibleItems.add(imageItem.id);

      // Queue private images for loading if not already loaded
      if (imageItem.isPrivate && imageItem.imagePath && !loadedImages.has(imageItem.imagePath)) {
        pathsToLoad.push(imageItem.imagePath);
      }
    });

    setVisibleItems(newVisibleItems);

    // Load presigned URLs for newly visible items
    if (enableBatchLoading && pathsToLoad.length > 0) {
      loadPresignedUrls(pathsToLoad);
    }
  }, [loadedImages, enableBatchLoading, loadPresignedUrls]);

  // Preload images near the viewport
  const preloadNearbyImages = useCallback((index: number) => {
    if (!enableBatchLoading) return;

    const startIndex = Math.max(0, index - preloadDistance);
    const endIndex = Math.min(data.length - 1, index + preloadDistance);
    const pathsToLoad: string[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const item = data[i];
      if (item?.isPrivate && item.imagePath && !loadedImages.has(item.imagePath)) {
        pathsToLoad.push(item.imagePath);
      }
    }

    if (pathsToLoad.length > 0) {
      loadPresignedUrls(pathsToLoad);
    }
  }, [data, enableBatchLoading, preloadDistance, loadedImages, loadPresignedUrls]);

  // Get image URL for an item
  const getImageUrl = useCallback((item: ImageItem): string | undefined => {
    if (item.imageUrl) {
      // Public image - use direct URL
      return item.imageUrl;
    } else if (item.imagePath && loadedImages.has(item.imagePath)) {
      // Private image - use presigned URL
      return loadedImages.get(item.imagePath);
    }
    return undefined;
  }, [loadedImages]);

  // Enhanced render item with image optimization
  const renderOptimizedItem = useCallback(({ item, index }: { item: ImageItem; index: number }) => {
    // Preload nearby images when rendering
    preloadNearbyImages(index);

    const imageUrl = getImageUrl(item);
    return renderItem(item, imageUrl);
  }, [renderItem, getImageUrl, preloadNearbyImages]);

  // Default key extractor
  const defaultKeyExtractor = useCallback((item: ImageItem) => item.id, []);

  // Viewability config for performance
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }), []);

  // Loading indicator for batch operations
  const renderLoadingFooter = useCallback(() => {
    if (!loadingBatch && !urlLoading) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={Colors.primaryBlue} />
        <Text style={styles.loadingText}>Loading images...</Text>
      </View>
    );
  }, [loadingBatch, urlLoading]);

  // Enhanced refresh control
  const enhancedRefreshControl = useMemo(() => {
    if (!onRefresh) return undefined;

    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={async () => {
          // Clear loaded images cache on refresh
          setLoadedImages(new Map());
          await onRefresh();
        }}
        tintColor={Colors.primaryBlue}
        colors={[Colors.primaryBlue]}
      />
    );
  }, [refreshing, onRefresh]);

  return (
    <FlatList
      data={data}
      renderItem={renderOptimizedItem}
      keyExtractor={keyExtractor || defaultKeyExtractor}
      numColumns={numColumns}
      horizontal={horizontal}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      contentContainerStyle={contentContainerStyle}
      style={style}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent || renderLoadingFooter}
      refreshControl={enhancedRefreshControl}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      removeClippedSubviews={true}
      maxToRenderPerBatch={batchSize}
      updateCellsBatchingPeriod={50}
      initialNumToRender={batchSize}
      windowSize={10}
      getItemLayout={
        numColumns === 1 && !horizontal
          ? (data, index) => ({
            length: verticalScale(200), // Estimated item height
            offset: verticalScale(200) * index,
            index,
          })
          : undefined
      }
    />
  );
};

const styles = StyleSheet.create({
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    marginLeft: scale(8),
  },
});

export default OptimizedImageList;