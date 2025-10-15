// screens/OfficerAnnouncementsScreen.tsx
import React, { useState, useEffect } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import Tag from 'components/ui/Tag';
import { useToast } from 'components/ui/ToastProvider';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import ProfileButton from 'components/ui/ProfileButton';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

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

interface Announcement {
  id: string;
  tag: TagType;
  title: string;
  message: string;
  postedDate: Date;
  views: number;
  attachments: {
    images: string[];
    links: string[];
  };
}

const OfficerAnnouncements = ({ navigation }: any) => {
  const { showSuccess, showError, showValidationError } = useToast();
  const { activeOrganization } = useOrganization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Removed setActiveTab - navigation is handled by the main navigator

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

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      tag: 'Event',
      title: 'End of Year Ceremony',
      message: 'Our annual End of Year Ceremony will be held on June 15th at 6:00 PM in the school auditorium. All members are required to attend in formal attire.',
      postedDate: new Date('2023-05-10T14:30:00'),
      views: 42,
      attachments: { images: [], links: [] }
    },
    {
      id: '2',
      tag: 'Reminder',
      title: 'Beach Cleanup Day',
      message: "Don't forget about our Beach Cleanup Day this Saturday, May 15th from 9:00 AM to 12:00 PM at Sunset Beach.",
      postedDate: new Date('2023-05-08T16:15:00'),
      views: 38,
      attachments: { images: [], links: [] }
    },
    {
      id: '3',
      tag: 'Urgent',
      title: 'Hour Submission Deadline',
      message: 'Reminder: All volunteer hours for this semester must be submitted by May 31st. Any hours submitted after this date will count towards next year\'s requirements.',
      postedDate: new Date('2023-05-05T10:00:00'),
      views: 65,
      attachments: { images: [], links: [] }
    },
  ]);

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

    const finalLinks = showLinkInput && linkUrl.trim() && isValidUrl(linkUrl)
      ? [...attachments.links, linkUrl.trim()]
      : attachments.links;

    const submissionData = {
      tag: selectedTag!,
      title: title.trim(),
      message: message.trim(),
      attachments: {
        images: attachments.images,
        links: finalLinks
      },
    };

    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      ...submissionData,
      postedDate: new Date(),
      views: 0,
    };

    setAnnouncements(prev => [newAnnouncement, ...prev]);

    console.log('Creating announcement:', submissionData);
    showSuccess('Announcement Created', 'Your announcement has been published successfully.');
    resetForm();
  };

  const resetForm = () => {
    setSelectedTag(null);
    setTitle('');
    setMessage('');
    setAttachments({ images: [], links: [] });
    setShowLinkInput(false);
    setLinkUrl('');
    setErrors({});
  };

  const handleTagPress = (tag: TagType) => {
    setSelectedTag(tag === selectedTag ? null : tag);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        showError('Permission Required', 'Camera roll permissions needed to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImage = result.assets[0].uri;
        setAttachments(prev => ({
          ...prev,
          images: [...prev.images, newImage]
        }));
        showSuccess('Image Added', 'Image attached successfully.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showError('Upload Error', 'Failed to select image. Please try again.');
    }
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

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    showSuccess('Deleted', 'Announcement removed successfully.');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' • ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Announcements</Text>
                <Text style={styles.headerSubtitle}>Manage NHS Updates</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.addButton}>
                  <Icon name="add" size={moderateScale(24)} color={Colors.solidBlue} />
                </TouchableOpacity>
                <ProfileButton
                  color={Colors.solidBlue}
                  size={moderateScale(28)}
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
              <View style={styles.attachmentsContainer}>
                <TouchableOpacity
                  style={styles.attachmentButton}
                  onPress={pickImage}
                >
                  <Icon name="image" size={moderateScale(24)} color={Colors.solidBlue} />
                  <Text style={styles.attachmentText}>Image</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachmentButton}
                  onPress={() => setShowLinkInput(!showLinkInput)}
                >
                  <Icon name="link" size={moderateScale(24)} color={Colors.solidBlue} />
                  <Text style={styles.attachmentText}>Link</Text>
                </TouchableOpacity>
              </View>

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
              {(attachments.images.length > 0 || attachments.links.length > 0) && (
                <View style={styles.attachmentsList}>
                  {attachments.images.map((image, index) => (
                    <View key={`image-${index}`} style={styles.attachmentItem}>
                      <Icon name="image" size={moderateScale(16)} color={Colors.textMedium} />
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        Image {index + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeAttachment('images', index)}
                        style={styles.removeButton}
                      >
                        <Icon name="close" size={moderateScale(16)} color={Colors.errorRed} />
                      </TouchableOpacity>
                    </View>
                  ))}
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

              {announcements.map((announcement) => (
                <View key={announcement.id} style={styles.announcementCard}>
                  <View style={styles.announcementHeader}>
                    <Tag
                      text={announcement.tag}
                      variant={tagVariants[announcement.tag]}
                      active={true}
                    />
                    <View style={styles.announcementActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteAnnouncement(announcement.id)}
                      >
                        <Icon name="delete" size={moderateScale(20)} color={Colors.textMedium} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                  <Text style={styles.announcementMessage} numberOfLines={3}>
                    {announcement.message}
                  </Text>

                  <View style={styles.announcementFooter}>
                    <Text style={styles.announcementMeta}>
                      Posted {formatDate(announcement.postedDate)}
                    </Text>
                    <Text style={styles.announcementViews}>
                      {announcement.views} views
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  attachmentsContainer: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: verticalScale(12),
  },
  attachmentButton: {
    flex: 1,
    height: verticalScale(80),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentText: {
    fontSize: moderateScale(12),
    color: Colors.solidBlue,
    fontWeight: '500',
    marginTop: verticalScale(6),
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
  announcementCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  announcementActions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  actionButton: {
    padding: scale(4),
  },
  announcementTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  announcementMessage: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(12),
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: Colors.dividerColor,
  },
  announcementMeta: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
  announcementViews: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
});

export default withRoleProtection(OfficerAnnouncements, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});