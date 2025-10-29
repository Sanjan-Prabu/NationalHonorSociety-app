# R2 Image Upload System Implementation Plan

- [x] 1. Set up foundation and database schema
  - Create database migration to add image columns to announcements, events, and volunteer_hours tables
  - Install required dependencies (@aws-sdk/client-s3, @aws-sdk/s3-request-presigner, expo-image-picker)
  - Create R2ConfigService for managing environment variables and S3 client configuration
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implement core image upload service and utilities
  - Create ImageUploadService with methods for public and private image uploads
  - Implement image validation functions (file size, format, corruption checks)
  - Create filename generation utilities with proper path conventions
  - Add error handling and retry logic for upload failures
  - _Requirements: 8.5, 10.1, 10.2, 10.3_

- [x] 3. Build reusable ImagePicker UI component
  - Create ImagePicker component with camera and gallery selection options
  - Implement image preview functionality with remove/change options
  - Add upload progress indicators and loading states
  - Integrate image validation with user-friendly error messages
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_

- [x] 4. Implement announcement image upload functionality
  - Integrate ImagePicker component into announcement creation form
  - Add public image upload logic using ImageUploadService
  - Store Direct_Public_URL in announcements.image_url column
  - Update announcement display components to show images directly from R2
  - Handle upload errors and prevent form submission on failures
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 5. Implement event image upload functionality
  - Integrate ImagePicker component into event creation form
  - Add public image upload logic reusing ImageUploadService methods
  - Store Direct_Public_URL in events.image_url column
  - Update event display components to show images directly from R2
  - Ensure consistent error handling with announcement uploads
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 6. Create presigned URL Edge Function for secure image access
  - Implement generate-presigned-url Supabase Edge Function
  - Add permission verification logic for organization-based access control
  - Create presigned URL generation with 1-hour expiration
  - Implement proper error responses for permission denied and invalid requests
  - Add request validation and input sanitization
  - _Requirements: 4.2, 4.3, 5.1, 5.2, 10.5_

- [x] 7. Implement volunteer hour image upload with secure viewing
  - Integrate ImagePicker component into volunteer hour submission form
  - Add private image upload logic storing only file paths in database
  - Create usePresignedUrl hook with caching and batch request capabilities
  - Implement "Click here to view image" placeholder functionality
  - Add secure image viewing that generates presigned URLs on demand
  - Ensure members can only view their own images and officers can view same-org images
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.4, 4.5, 5.3, 5.4_

- [x] 8. Add comprehensive error handling and validation
  - Implement client-side error recovery with retry logic
  - Add server-side error handling in Edge Function
  - Create user-friendly error messages for all failure scenarios
  - Add network connectivity checks before upload attempts
  - _Requirements: 10.4, 10.6_

- [x] 9. Implement performance optimizations
  - Add presigned URL caching with 1-hour expiration
  - Implement batch presigned URL generation for lists
  - Add image lazy loading for better performance
  - Optimize upload progress tracking and user feedback
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10. Add comprehensive testing suite
  - Write unit tests for ImageUploadService validation and upload logic
  - Create integration tests for end-to-end upload and viewing workflows
  - Add security tests for organization isolation and permission verification
  - Test error scenarios and edge cases
  - _Requirements: All requirements validation_