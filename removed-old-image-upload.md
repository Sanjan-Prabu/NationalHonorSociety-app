# Removed Old Image Upload Section

## What Was Removed
Removed the old "Event Image or Flyer" upload section from the CreateEventScreen since we now have the proper attachments section that matches the announcements functionality.

## Changes Made

### 1. Removed UI Section
- **Removed entire "Event Image or Flyer" section** from the form
- **Removed upload button** with cloud-upload icon
- **Removed image preview** display
- **Removed "Coming Soon" placeholder** functionality

### 2. Removed State Variables
- **Removed `selectedImage` state** - no longer needed
- **Kept attachments state** - this handles both images and links properly

### 3. Removed Functions
- **Removed `pickImage()` function** - handled image selection from gallery
- **Removed `removeImage()` function** - handled removing selected image
- **Removed ImagePicker permission handling**

### 4. Removed Imports
- **Removed `* as ImagePicker from 'expo-image-picker'`** - no longer used

### 5. Removed Styles
- **Removed all image upload styles**:
  - `uploadButton`, `uploadButtonText`, `uploadSubtext`
  - `selectedImageContainer`, `imagePreview`, `imagePreviewText`
  - `removeImageButton`

## Why This Was Removed
1. **Duplicate functionality** - The attachments section already has an Image button (disabled, "Coming Soon")
2. **Consistency** - Now matches the announcements screen exactly
3. **Cleaner UI** - Removes redundant upload section
4. **Better organization** - All attachments (images and links) are in one section

## Current State
The event creation form now has:
- ✅ **Single attachments section** with Image and Link buttons
- ✅ **Image button disabled** with "Coming Soon" text (matches announcements)
- ✅ **Link button active** with full functionality
- ✅ **Consistent design** with announcements screen
- ✅ **Cleaner form layout** without duplicate sections

## Result
The event creation screen is now cleaner and more consistent:
- **No duplicate image upload sections**
- **Single attachments area** that matches announcements exactly
- **Streamlined form** with better organization
- **Consistent user experience** across announcements and events

The form now flows better: Description → Attachments → Create Event Button