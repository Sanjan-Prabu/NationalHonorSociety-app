# ImagePicker Component

A reusable React Native component for image selection and upload with comprehensive validation, progress tracking, and error handling.

## Features

### Core Functionality
- **Camera and Gallery Selection**: Users can choose between taking a photo with the camera or selecting from their photo library
- **Image Preview**: Selected images are displayed with a preview thumbnail
- **Edit/Remove Actions**: Users can change or remove selected images before uploading
- **Upload Progress**: Visual indicators show upload progress and validation states
- **Success Feedback**: Optional success confirmation when validation passes

### Validation and Error Handling
- **File Size Validation**: Ensures images are under 5MB
- **Format Validation**: Accepts only JPG and PNG formats
- **Corruption Detection**: Basic checks to detect corrupted image files
- **User-Friendly Error Messages**: Clear, actionable error messages for all failure scenarios
- **Network Error Handling**: Graceful handling of connectivity issues

### Integration Features
- **ImageUploadService Integration**: Seamless integration with the R2 image upload service
- **Validation Callbacks**: Optional callback for handling validation errors
- **Loading States**: Support for external loading states during upload
- **Disabled States**: Can be disabled during processing or based on user permissions

## Props Interface

```typescript
interface ImagePickerProps {
  onImageSelected: (imageUri: string) => void;
  onImageRemoved: () => void;
  onValidationError?: (error: string) => void;
  selectedImage?: string;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
  error?: string;
  showSuccessIndicator?: boolean;
}
```

### Required Props
- `onImageSelected`: Callback fired when a valid image is selected
- `onImageRemoved`: Callback fired when the user removes the selected image

### Optional Props
- `onValidationError`: Callback for handling validation errors
- `selectedImage`: URI of the currently selected image
- `disabled`: Disables all interactions when true
- `placeholder`: Custom placeholder text (default: "Add Image")
- `loading`: Shows loading state when true
- `error`: Error message to display
- `showSuccessIndicator`: Shows success feedback after validation

## Usage Examples

### Basic Usage
```tsx
import ImagePicker from '../components/ui/ImagePicker';

const MyComponent = () => {
  const [selectedImage, setSelectedImage] = useState<string>();

  return (
    <ImagePicker
      onImageSelected={setSelectedImage}
      onImageRemoved={() => setSelectedImage(undefined)}
      selectedImage={selectedImage}
      placeholder="Select Profile Picture"
    />
  );
};
```

### With Upload Integration
```tsx
import ImagePicker from '../components/ui/ImagePicker';
import ImageUploadService from '../services/ImageUploadService';

const AnnouncementForm = () => {
  const [imageUri, setImageUri] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const handleImageSelected = async (uri: string) => {
    setUploading(true);
    setError(undefined);

    try {
      const imageUploadService = ImageUploadService.getInstance();
      const publicUrl = await imageUploadService.uploadPublicImage(
        uri,
        'announcements',
        'nhs'
      );
      setImageUri(publicUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ImagePicker
      onImageSelected={handleImageSelected}
      onImageRemoved={() => setImageUri(undefined)}
      onValidationError={setError}
      selectedImage={imageUri}
      loading={uploading}
      error={error}
      showSuccessIndicator={true}
      placeholder="Add Announcement Image"
    />
  );
};
```

### With Error Handling
```tsx
const ComponentWithErrorHandling = () => {
  const [validationError, setValidationError] = useState<string>();

  const handleValidationError = (error: string) => {
    setValidationError(error);
    // Log error or show toast notification
    console.warn('Image validation failed:', error);
  };

  return (
    <View>
      <ImagePicker
        onImageSelected={handleImageSelected}
        onImageRemoved={handleImageRemoved}
        onValidationError={handleValidationError}
        error={validationError}
      />
    </View>
  );
};
```

## Validation Rules

The component automatically validates selected images against the following criteria:

### File Size
- **Limit**: 5MB maximum
- **Error**: "File too large. Please select an image under 5MB"

### File Format
- **Accepted**: JPG, JPEG, PNG
- **Error**: "Invalid file type. Please select a JPG or PNG image"

### File Integrity
- **Check**: Basic corruption detection
- **Error**: "Selected file appears to be corrupted"

### Network Connectivity
- **Check**: Network availability during validation
- **Error**: "Network error. Unable to process image. Check your connection"

## States and Feedback

### Visual States
1. **Empty State**: Shows placeholder with camera icon
2. **Selected State**: Shows image preview with edit/remove buttons
3. **Loading State**: Shows spinner with "Uploading..." or "Validating..." text
4. **Success State**: Optional checkmark with "Valid Image" text
5. **Error State**: Red border and error message below component

### User Interactions
1. **Tap to Select**: Opens camera/gallery selection dialog
2. **Edit Image**: Tap edit button to select a different image
3. **Remove Image**: Tap remove button with confirmation dialog
4. **Disabled State**: All interactions disabled, visual feedback provided

## Permissions

The component automatically handles permission requests:

### Camera Permission
- Requested when user selects "Camera" option
- Shows appropriate error message if denied

### Media Library Permission
- Requested when user selects "Gallery" option
- Shows appropriate error message if denied

## Integration with ImageUploadService

The component is designed to work seamlessly with the `ImageUploadService`:

```typescript
// The component validates images using the same service
const imageUploadService = ImageUploadService.getInstance();
const validation = await imageUploadService.validateImage(imageUri);
```

This ensures consistent validation rules across the application and provides a unified error handling experience.

## Accessibility

The component includes proper accessibility features:
- Screen reader support for all interactive elements
- Proper focus management
- Descriptive labels for buttons and states
- High contrast error states

## Performance Considerations

- **Lazy Loading**: Images are only processed when selected
- **Memory Management**: Proper cleanup of image URIs
- **Validation Caching**: Validation results are cached to avoid repeated checks
- **Optimized Rendering**: Minimal re-renders during state changes

## Testing

The component includes comprehensive test coverage for:
- Image selection flows (camera and gallery)
- Validation error scenarios
- Loading and success states
- User interaction handling
- Permission request flows

See `src/__tests__/components/ImagePicker.test.tsx` for detailed test cases.

## Requirements Compliance

This component fulfills the following requirements from the R2 Image Upload System specification:

- **8.1**: ✅ Camera capture and gallery selection options
- **8.2**: ✅ Image preview thumbnail before upload
- **8.3**: ✅ Progress indicator during upload/validation
- **8.4**: ✅ Success confirmation feedback
- **8.5**: ✅ Clear error messages with retry capability
- **8.6**: ✅ Remove/change image functionality

The component provides a complete, production-ready solution for image selection and validation in the NHS/NHSA mobile application.