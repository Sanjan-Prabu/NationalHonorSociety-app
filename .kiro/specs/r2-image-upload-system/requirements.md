# R2 Image Upload System Requirements

## Introduction

This feature implements a hybrid image upload system using Cloudflare R2 storage for the NHS/NHSA club management mobile app. The system supports two distinct security models: public direct URLs for announcements and events, and private presigned URLs for volunteer hour verification images. This approach optimizes performance while maintaining appropriate security boundaries and avoiding Supabase egress fees.

## Glossary

- **R2_Storage_System**: Cloudflare R2 object storage service providing S3-compatible API
- **Public_Bucket**: R2 bucket configured for public access where announcement and event images are stored
- **Private_Bucket**: R2 bucket configured for private access where volunteer hour verification images are stored
- **Direct_Public_URL**: Full HTTP URL pointing directly to public R2 bucket content
- **Presigned_URL**: Temporary authenticated URL providing time-limited access to private bucket content
- **Image_Upload_Service**: Client-side service handling image selection, validation, and upload operations
- **Presigned_URL_Generator**: Supabase Edge Function that creates temporary URLs for private images
- **Organization_Context**: Current user's NHS or NHSA organization membership determining access boundaries

## Requirements

### Requirement 1: Public Image Upload for Announcements

**User Story:** As an officer, I want to upload images to announcements so that I can share visual content with members

#### Acceptance Criteria

1. WHEN an officer creates an announcement, THE Image_Upload_Service SHALL provide an image selection interface
2. WHEN an officer selects an image, THE Image_Upload_Service SHALL validate the file size is under 5MB
3. WHEN an officer selects an image, THE Image_Upload_Service SHALL validate the file format is JPG or PNG
4. WHEN image validation passes, THE Image_Upload_Service SHALL upload the image to Public_Bucket with path announcements/{org_id}/{timestamp}-{randomString}.jpg
5. WHEN upload completes successfully, THE R2_Storage_System SHALL return the Direct_Public_URL
6. WHEN announcement is saved, THE system SHALL store the Direct_Public_URL in announcements.image_url column
7. WHEN announcements are displayed, THE system SHALL render images using the Direct_Public_URL without additional authentication

### Requirement 2: Public Image Upload for Events

**User Story:** As an officer, I want to upload images to events so that members can see visual details about upcoming activities

#### Acceptance Criteria

1. WHEN an officer creates an event, THE Image_Upload_Service SHALL provide an image selection interface
2. WHEN an officer selects an image, THE Image_Upload_Service SHALL validate the file size is under 5MB
3. WHEN an officer selects an image, THE Image_Upload_Service SHALL validate the file format is JPG or PNG
4. WHEN image validation passes, THE Image_Upload_Service SHALL upload the image to Public_Bucket with path events/{org_id}/{timestamp}-{randomString}.jpg
5. WHEN upload completes successfully, THE R2_Storage_System SHALL return the Direct_Public_URL
6. WHEN event is saved, THE system SHALL store the Direct_Public_URL in events.image_url column
7. WHEN events are displayed, THE system SHALL render images using the Direct_Public_URL without additional authentication

### Requirement 3: Private Image Upload for Volunteer Hours

**User Story:** As a member, I want to upload proof images with my volunteer hour submissions so that officers can verify my work

#### Acceptance Criteria

1. WHEN a member submits volunteer hours, THE Image_Upload_Service SHALL provide an optional image selection interface
2. WHEN a member selects an image, THE Image_Upload_Service SHALL validate the file size is under 5MB
3. WHEN a member selects an image, THE Image_Upload_Service SHALL validate the file format is JPG or PNG
4. WHEN image validation passes, THE Image_Upload_Service SHALL upload the image to Private_Bucket with path volunteer-hours/{org_id}/{user_id}/{timestamp}-{randomString}.jpg
5. WHEN upload completes successfully, THE system SHALL store only the file path in volunteer_hours.image_path column
6. WHEN volunteer hours are saved, THE system SHALL NOT store any Direct_Public_URL for private images

### Requirement 4: Secure Image Viewing for Volunteer Hours

**User Story:** As an officer, I want to view volunteer hour proof images so that I can verify member submissions

#### Acceptance Criteria

1. WHEN an officer views volunteer hour submissions with images, THE system SHALL display a "Click here to view image" placeholder
2. WHEN an officer clicks the image placeholder, THE Presigned_URL_Generator SHALL verify the officer has permission to view the image
3. WHEN permission verification passes, THE Presigned_URL_Generator SHALL create a temporary URL valid for 1 hour
4. WHEN the Presigned_URL is generated, THE system SHALL display the image in full resolution
5. WHEN a member views their own volunteer hour submissions, THE system SHALL allow image viewing through the same Presigned_URL mechanism

### Requirement 5: Organization-Based Access Control

**User Story:** As a system administrator, I want to ensure users can only access images from their own organization so that data remains properly isolated

#### Acceptance Criteria

1. WHEN generating Presigned_URLs, THE Presigned_URL_Generator SHALL verify the requesting user belongs to the same Organization_Context as the image owner
2. WHEN a user attempts to access an image from a different organization, THE Presigned_URL_Generator SHALL return a 403 Forbidden error
3. WHEN uploading images, THE Image_Upload_Service SHALL include the user's Organization_Context in the file path
4. WHEN displaying images, THE system SHALL only show images that belong to the user's current Organization_Context

### Requirement 6: Database Schema Support

**User Story:** As a developer, I want the database to support image storage metadata so that the application can properly manage uploaded images

#### Acceptance Criteria

1. THE announcements table SHALL include an image_url column of type TEXT NULL
2. THE events table SHALL include an image_url column of type TEXT NULL  
3. THE volunteer_hours table SHALL include an image_path column of type TEXT NULL
4. WHEN no image is uploaded, THE image columns SHALL remain NULL
5. WHEN images are uploaded, THE appropriate column SHALL store either the Direct_Public_URL or file path based on the security model

### Requirement 7: Environment-Based Configuration

**User Story:** As a developer, I want the system to use different R2 buckets for development and production so that environments remain isolated

#### Acceptance Criteria

1. THE Image_Upload_Service SHALL read R2 configuration from environment variables
2. WHEN running in development, THE system SHALL use development bucket names and URLs
3. WHEN running in production, THE system SHALL use production bucket names and URLs
4. THE system SHALL support the following environment variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_PUBLIC_BUCKET_NAME, R2_PUBLIC_URL, R2_PRIVATE_BUCKET_NAME

### Requirement 8: Image Upload User Experience

**User Story:** As a user, I want a smooth image upload experience so that I can easily add images to my posts

#### Acceptance Criteria

1. WHEN selecting images, THE Image_Upload_Service SHALL provide options for camera capture and gallery selection
2. WHEN an image is selected, THE system SHALL display a preview thumbnail before upload
3. WHEN uploading images, THE system SHALL show a progress indicator
4. WHEN upload completes, THE system SHALL show a success confirmation
5. WHEN upload fails, THE system SHALL display a clear error message and allow retry
6. WHEN an image is selected, THE user SHALL be able to remove or change the image before submitting

### Requirement 9: Performance Optimization

**User Story:** As a user, I want fast image loading so that the app remains responsive

#### Acceptance Criteria

1. WHEN displaying announcement and event images, THE system SHALL load images directly from R2 without intermediate processing
2. WHEN generating Presigned_URLs, THE Presigned_URL_Generator SHALL complete requests in under 500 milliseconds
3. WHEN multiple volunteer hour images are displayed, THE system SHALL batch Presigned_URL generation requests
4. WHEN Presigned_URLs are generated, THE system SHALL cache them in memory for up to 1 hour to avoid repeated requests
5. WHEN images are uploaded, THE process SHALL complete within 5 seconds for files under 5MB

### Requirement 10: Error Handling and Validation

**User Story:** As a user, I want clear feedback when image operations fail so that I can understand and resolve issues

#### Acceptance Criteria

1. WHEN file size exceeds 5MB, THE Image_Upload_Service SHALL display "File too large. Please select an image under 5MB"
2. WHEN file format is invalid, THE Image_Upload_Service SHALL display "Invalid file type. Please select a JPG or PNG image"
3. WHEN network upload fails, THE system SHALL display "Upload failed. Please check your connection and try again"
4. WHEN Presigned_URL generation fails, THE system SHALL display "Unable to load image. Please try again later"
5. WHEN permission is denied for image access, THE system SHALL display "You don't have permission to view this image"
6. WHEN any upload error occurs, THE system SHALL prevent form submission until the issue is resolved


### Credit Criteria

1. to create this functionality it must be extremely efficient and no extra credits should be wasted.
2. credits must be used sparingly and effectively and not wasted
