// screens/OfficerAnnouncementsScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

import Tag from 'components/ui/Tag';
import AnnouncementCard from 'components/ui/AnnouncementCard';
import ImagePicker from 'components/ui/ImagePicker';
import { useToast } from 'components/ui/ToastProvider';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import ProfileButton from 'components/ui/ProfileButton';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAnnouncementData } from '../../hooks/useAnnouncementData';
import { CreateAnnouncementRequest } from '../../services/AnnouncementService';
import ImageUploadService from '../../services/ImageUploadService';
import PreciseDiagnostic from '../../components/debug/PreciseDiagnostic';


const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
  dividerColor: '#D1D5DB',
  errorRed: '#E53E3E',
  successGreen: '#38A169',
  lightGray: '#F7FAFC',
};

type TagType = 'Event' | 'Reminder' | 'Urgent' | 'Flyer';

const OfficerAnnouncements = ({ navigation }: any) => {
  const { showSuccess, showError, showValidationError } = useToast();
  const { activeOrganization } = useOrganization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Memoize the options to prevent infinite re-renders
  const announcementDataOptions = useMemo(() => ({
    enableRealtime: true
  }), []);

  // Use announcement data hook with realtime subscriptions
  const {
    announcements,
    loading,
    createAnnouncement,
    deleteAnnouncement,
    refreshAnnouncements,
    createState,
    deleteState
  } = useAnnouncementData(announcementDataOptions);

  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<{
    images: string[];
    links: string[];
  }>({
    images: [],
    links: [],
  });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const imageUploadService = ImageUploadService.getInstance();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    visible: boolean;
    announcementId: string | null;
    announcementTitle: string;
  }>({
    visible: false,
    announcementId: null,
    announcementTitle: '',
  });

  const tagVariants: Record<TagType, 'blue' | 'green' | 'yellow' | 'purple'> = {
    'Event': 'blue',
    'Reminder': 'green',
    'Urgent': 'yellow',
    'Flyer': 'purple',
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedTag) {
      newErrors.tag = 'Please select a tag';
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (!message.trim()) {
      newErrors.message = 'Message is required';
    } else if (message.length > 1000) {
      newErrors.message = 'Message must be 1000 characters or less';
    }

    if (showLinkInput && linkUrl.trim() && !isValidUrl(linkUrl)) {
      newErrors.link = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showValidationError('Validation Error', 'Please fill out all required fields correctly.');
      return;
    }

    // Check if image is still uploading
    if (imageUploading) {
      showValidationError('Upload in Progress', 'Please wait for the image to finish uploading.');
      return;
    }

    // Check for image upload errors
    if (imageUploadError) {
      showValidationError('Image Upload Error', 'Please resolve the image upload error before submitting.');
      return;
    }

    const finalLinks = showLinkInput && linkUrl.trim() && isValidUrl(linkUrl)
      ? [...attachments.links, linkUrl.trim()]
      : attachments.links;

    let imageUrl: string | undefined = undefined;

    // Upload image if selected
    if (selectedImage) {
      try {
        setImageUploading(true);
        setImageUploadError(null);
        
        if (!activeOrganization?.id) {
          throw new Error('No active organization found');
        }

        imageUrl = await imageUploadService.uploadPublicImage(
          selectedImage,
          'announcements',
          activeOrganization.id
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Image upload failed';
        setImageUploadError(errorMessage);
        showError('Image Upload Failed', errorMessage);
        setImageUploading(false);
        return;
      } finally {
        setImageUploading(false);
      }
    }

    const submissionData: CreateAnnouncementRequest = {
      tag: selectedTag!,
      title: title.trim(),
      message: message.trim(),
      link: finalLinks.length > 0 ? finalLinks[0] : undefined,
      image_url: imageUrl,
    };

    try {
      const result = await createAnnouncement(submissionData);

      if (result.success) {
        showSuccess('Announcement Created', 'Your announcement has been published successfully.');
        resetForm();
      } else {
        showError('Creation Failed', result.error || 'Failed to create announcement. Please try again.');
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      showError('Creation Failed', 'An unexpected error occurred. Please try again.');
    }
  };

  const resetForm = () => {
    setSelectedTag(null);
    setTitle('');
    setMessage('');
    setAttachments({ images: [], links: [] });
    setShowLinkInput(false);
    setLinkUrl('');
    setErrors({});
    setSelectedImage(null);
    setImageUploading(false);
    setImageUploadError(null);
  };

  const handleTagPress = (tag: TagType) => {
    setSelectedTag(tag === selectedTag ? null : tag);
  };

  const handleImageSelected = (imageUri: string) => {
    setSelectedImage(imageUri);
    setImageUploadError(null);
  };

  const handleImageRemoved = () => {
    setSelectedImage(null);
    setImageUploadError(null);
  };

  const handleImageValidationError = (error: string) => {
    setImageUploadError(error);
  };



  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      showValidationError('Link Required', 'Please enter a URL');
      return;
    }

    if (!isValidUrl(linkUrl)) {
      showValidationError('Invalid URL', 'Please enter a valid URL');
      return;
    }

    setAttachments(prev => ({
      ...prev,
      links: [...prev.links, linkUrl.trim()]
    }));
    setLinkUrl('');
    setShowLinkInput(false);
    showSuccess('Link Added', 'Link attached successfully.');
  };

  const removeAttachment = (type: 'images' | 'links', index: number) => {
    setAttachments(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const showDeleteConfirmation = (id: string, title: string) => {
    setDeleteConfirmation({
      visible: true,
      announcementId: id,
      announcementTitle: title,
    });
  };

  const hideDeleteConfirmation = () => {
    setDeleteConfirmation({
      visible: false,
      announcementId: null,
      announcementTitle: '',
    });
  };

  const confirmDeleteAnnouncement = async () => {
    if (!deleteConfirmation.announcementId) return;

    try {
      const result = await deleteAnnouncement(deleteConfirmation.announcementId);

      if (result.success) {
        showSuccess('Deleted', 'Announcement removed successfully.');
        hideDeleteConfirmation();
      } else {
        showError('Delete Failed', result.error || 'Failed to delete announcement. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError('Delete Failed', 'An unexpected error occurred. Please try again.');
    }
  };



  // Removed handleTabPress - navigation is handled by the main navigator

  return (
    <LinearGradient
      colors={Colors.LandingScreenGradient}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? verticalScale(60) : 0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContainer,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom + verticalScale(100),
              }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <PreciseDiagnostic />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Announcements</Text>
                <Text style={styles.headerSubtitle}>
                  Manage {activeOrganization?.slug === 'nhsa' ? 'NHSA' : 'NHS'} Updates
                </Text>
              </View>
              <View style={styles.headerRight}>
                <ProfileButton
                  color={Colors.solidBlue}
                  size={moderateScale(32)}
                />
              </View>
            </View>

            {/* Create Announcement Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Create Announcement</Text>

              {/* Tag Section */}
              <Text style={styles.sectionLabel}>Tag</Text>
              <View style={styles.tagsContainer}>
                {(['Event', 'Reminder', 'Urgent', 'Flyer'] as TagType[]).map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => handleTagPress(tag)}
                    style={styles.tagButton}
                  >
                    <Tag
                      text={tag}
                      variant={tagVariants[tag]}
                      active={selectedTag === tag}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {errors.tag && <Text style={styles.errorText}>{errors.tag}</Text>}

              {/* Title Input */}
              <Text style={styles.sectionLabel}>Title</Text>
              <TextInput
                style={[styles.textInput, errors.title && styles.inputError]}
                placeholder="Enter announcement title"
                placeholderTextColor={Colors.textLight}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

              {/* Message Input */}
              <Text style={styles.sectionLabel}>Message</Text>
              <TextInput
                style={[styles.messageInput, errors.message && styles.inputError]}
                placeholder="Write your announcement..."
                placeholderTextColor={Colors.textLight}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.characterCount}>{message.length}/1000</Text>
              {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}

              {/* Attachments Section */}
              <Text style={styles.sectionLabel}>Attachments</Text>
              
              {/* Image Upload */}
              <Text style={styles.subSectionLabel}>Image</Text>
              <ImagePicker
                onImageSelected={handleImageSelected}
                onImageRemoved={handleImageRemoved}
                onValidationError={handleImageValidationError}
                selectedImage={selectedImage || undefined}
                loading={imageUploading}
                error={imageUploadError || undefined}
                placeholder="Add Image"
                showSuccessIndicator={true}
              />

              {/* Link Section */}
              <Text style={styles.subSectionLabel}>Link</Text>
              <TouchableOpacity
                style={styles.linkToggleButton}
                onPress={() => setShowLinkInput(!showLinkInput)}
              >
                <Icon name="link" size={moderateScale(20)} color={Colors.solidBlue} />
                <Text style={styles.linkToggleText}>
                  {showLinkInput ? 'Cancel Link' : 'Add Link'}
                </Text>
              </TouchableOpacity>

              {/* Link Input */}
              {showLinkInput && (
                <View style={styles.linkInputContainer}>
                  <TextInput
                    style={[styles.textInput, errors.link && styles.inputError]}
                    placeholder="Paste link here..."
                    placeholderTextColor={Colors.textLight}
                    value={linkUrl}
                    onChangeText={setLinkUrl}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.linkActions}>
                    <TouchableOpacity
                      style={styles.cancelLinkButton}
                      onPress={() => {
                        setShowLinkInput(false);
                        setLinkUrl('');
                      }}
                    >
                      <Text style={styles.cancelLinkText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addLinkButton}
                      onPress={handleAddLink}
                    >
                      <Text style={styles.addLinkText}>Add Link</Text>
                    </TouchableOpacity>
                  </View>
                  {errors.link && <Text style={styles.errorText}>{errors.link}</Text>}
                </View>
              )}

              {/* Selected Attachments */}
              {attachments.links.length > 0 && (
                <View style={styles.attachmentsList}>
                  {attachments.links.map((link, index) => (
                    <View key={`link-${index}`} style={styles.attachmentItem}>
                      <Icon name="link" size={moderateScale(16)} color={Colors.textMedium} />
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {link}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeAttachment('links', index)}
                        style={styles.removeButton}
                      >
                        <Icon name="close" size={moderateScale(16)} color={Colors.errorRed} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Post Announcement</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Announcements Section */}
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Recent Announcements</Text>

              {loading.isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading announcements...</Text>
                </View>
              ) : loading.isError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorContainerText}>Failed to load announcements</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={refreshAnnouncements}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : announcements.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No announcements yet</Text>
                  <Text style={styles.emptySubtext}>Create your first announcement above</Text>
                </View>
              ) : (
                announcements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    showDeleteButton={true} // Officers can delete announcements
                    onDelete={(id) => showDeleteConfirmation(id, announcement.title)}
                    deleteLoading={deleteState.isLoading}
                  />
                ))
              )}

            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Delete Confirmation Modal */}
        {deleteConfirmation.visible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Icon name="warning" size={moderateScale(24)} color={Colors.errorRed} />
                <Text style={styles.modalTitle}>Delete Announcement</Text>
              </View>

              <Text style={styles.modalMessage}>
                Are you sure you want to delete "{deleteConfirmation.announcementTitle}"?
              </Text>

              <Text style={styles.modalSubMessage}>
                This action cannot be undone. The announcement will be removed from all members' feeds.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={hideDeleteConfirmation}
                  disabled={deleteState.isLoading}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalDeleteButton, deleteState.isLoading && styles.modalDeleteButtonDisabled]}
                  onPress={confirmDeleteAnnouncement}
                  disabled={deleteState.isLoading}
                >
                  <Text style={styles.modalDeleteText}>
                    {deleteState.isLoading ? 'Deleting...' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Navigation is handled by the main OfficerBottomNavigator */}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(24),
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  headerSubtitle: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginTop: verticalScale(2),
  },
  addButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: moderateScale(24),
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    padding: scale(20),
    marginBottom: verticalScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8),
    elevation: 2,
  },
  formTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.solidBlue,
    marginBottom: verticalScale(20),
  },
  sectionLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginBottom: verticalScale(8),
    marginTop: verticalScale(12),
  },
  subSectionLabel: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: Colors.textMedium,
    marginBottom: verticalScale(6),
    marginTop: verticalScale(8),
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: verticalScale(8),
  },
  tagButton: {
    marginBottom: verticalScale(8),
  },
  textInput: {
    height: verticalScale(48),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(16),
    backgroundColor: Colors.inputBackground,
    fontSize: moderateScale(14),
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  messageInput: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    fontSize: moderateScale(14),
    color: Colors.textDark,
    minHeight: verticalScale(120),
    textAlignVertical: 'top',
    marginBottom: verticalScale(4),
  },
  characterCount: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    textAlign: 'right',
    marginBottom: verticalScale(4),
  },
  linkToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    marginBottom: verticalScale(8),
  },
  linkToggleText: {
    fontSize: moderateScale(14),
    color: Colors.solidBlue,
    fontWeight: '500',
    marginLeft: scale(8),
  },
  linkInputContainer: {
    marginTop: verticalScale(12),
    marginBottom: verticalScale(12),
  },
  linkActions: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: verticalScale(12),
  },
  cancelLinkButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    fontWeight: '500',
  },
  addLinkButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.solidBlue,
    alignItems: 'center',
  },
  addLinkText: {
    fontSize: moderateScale(14),
    color: Colors.white,
    fontWeight: '500',
  },
  attachmentsList: {
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: moderateScale(6),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(6),
  },
  attachmentName: {
    flex: 1,
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    marginLeft: scale(8),
  },
  removeButton: {
    padding: scale(4),
  },
  submitButton: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    marginTop: verticalScale(16),
    shadowColor: Colors.solidBlue,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(6),
    elevation: 6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.errorRed,
  },
  errorText: {
    color: Colors.errorRed,
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
    marginBottom: verticalScale(8),
  },
  recentSection: {
    marginBottom: verticalScale(20),
  },
  recentTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.solidBlue,
    marginBottom: verticalScale(16),
  },

  loadingContainer: {
    padding: scale(20),
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
  },
  errorContainer: {
    padding: scale(20),
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
  },
  errorContainerText: {
    fontSize: moderateScale(14),
    color: Colors.errorRed,
    marginBottom: verticalScale(12),
  },
  retryButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(6),
  },
  retryText: {
    fontSize: moderateScale(12),
    color: Colors.white,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: scale(20),
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    fontWeight: '500',
    marginBottom: verticalScale(4),
  },
  emptySubtext: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    padding: scale(24),
    marginHorizontal: scale(32),
    maxWidth: scale(320),
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(8) },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(16),
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginLeft: scale(12),
  },
  modalMessage: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(8),
  },
  modalSubMessage: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    lineHeight: moderateScale(18),
    marginBottom: verticalScale(24),
  },
  modalActions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    fontWeight: '500',
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.errorRed,
    alignItems: 'center',
  },
  modalDeleteButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  modalDeleteText: {
    fontSize: moderateScale(14),
    color: Colors.white,
    fontWeight: '500',
  },
});

export default withRoleProtection(OfficerAnnouncements, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});