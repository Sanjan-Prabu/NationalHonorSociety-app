import React from 'react';
import { Image, ImageProps } from 'react-native';

interface DirectImageProps extends ImageProps {
  source: { uri: string };
}

/**
 * Direct Image component - no processing, no complex logic
 * Just displays the image URL directly
 */
const DirectImage: React.FC<DirectImageProps> = ({ source, ...props }) => {
  return (
    <Image
      source={source}
      {...props}
    />
  );
};

export default DirectImage;