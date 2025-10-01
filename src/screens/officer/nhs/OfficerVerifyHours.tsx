import React, { useState, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import BottomNavigator, { useBottomNav } from 'components/commons/member/BottomNavigator';
import { useToast } from 'components/ui/ToastProvider';

const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  cardBackground: '#FFFFFF',
  dividerColor: '#D1D5DB',
  lightBlue: '#EBF8FF',
  successGreen: '#38A169',
  errorRed: '#E53E3E',
  warningOrange: '#DD6B20',
  pendingYellow: '#D69E2E',
  verifiedGreen: '#48BB78',
  rejectedRed: '#E53E3E',
  avatarBackground: '#4A5568',
  inputBackground: '#F9FAFB'
};

interface VerificationRequest {
  id: string;
  memberInitials: string;
  memberName: string;
  submittedTime: string;
  status: 'pending' | 'verified' | 'rejected';
  eventName: string;
  eventType: string;
  hours: number;
  date: string;
  notes: string;
  proofImageUrl: string | null;
}

const OfficerVerifyHours = ({ navigation }: any) => {
  const { setActiveTab } = useBottomNav();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();

  // Set this screen as active when it mounts
  useEffect(() => {
    setActiveTab('verify');
  }, [setActiveTab]);

  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  // Mock data for verification requests - will be replaced with DB data
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([
    {
      id: 'req_1',
      memberInitials: 'SJ',
      memberName: 'Sarah Johnson',
      submittedTime: '2 hours ago',
      status: 'pending',
      eventName: 'Beach Cleanup Day',
      eventType: '',
      hours: 3.0,
      date: 'May 15, 2023',
      notes: 'Helped organize cleanup stations and collected trash along the shoreline. Great turnout from the community!',
      proofImageUrl: null,
    },
    {
      id: 'req_2',
      memberInitials: 'MT',
      memberName: 'Michael Thompson',
      submittedTime: '4 hours ago',
      status: 'pending',
      eventName: 'Food Bank Volunteer',
      eventType: '',
      hours: 2.5,
      date: 'May 12, 2023',
      notes: 'Sorted donations and helped distribute food packages to families in need.',
      proofImageUrl: null,
    },
    {
      id: 'req_3',
      memberInitials: 'AW',
      memberName: 'Amanda Wilson',
      submittedTime: '6 hours ago',
      status: 'pending',
      eventName: 'Library Reading Program',
      eventType: '',
      hours: 4.0,
      date: 'May 10, 2023',
      notes: 'Read stories to children ages 5-8 and helped with craft activities during story time.',
      proofImageUrl: null,
    },
  ]);

  const currentRequest = verificationRequests[currentRequestIndex];

  const handleVerify = () => {
    // Add your verification logic here - update DB, etc.
    console.log('Verifying request:', currentRequest.id);
    showSuccess('Hours Verified', `${currentRequest.memberName}'s hours have been verified.`);
    
    // Move to next request or reset
    if (currentRequestIndex < verificationRequests.length - 1) {
      setCurrentRequestIndex(prev => prev + 1);
    } else {
      // All requests processed
      setCurrentRequestIndex(0);
    }
    
    setShowRejectionInput(false);
    setRejectionReason('');
  };

  const handleReject = () => {
    if (!showRejectionInput) {
      setShowRejectionInput(true);
      return;
    }

    if (!rejectionReason.trim()) {
      showError('Validation Error', 'Please provide a reason for rejection');
      return;
    }

    // Add your rejection logic here - update DB, notify member, etc.
    console.log('Rejecting request:', currentRequest.id, 'Reason:', rejectionReason);
    showSuccess('Hours Rejected', `${currentRequest.memberName} has been notified.`);
    
    // Move to next request or reset
    if (currentRequestIndex < verificationRequests.length - 1) {
      setCurrentRequestIndex(prev => prev + 1);
    } else {
      // All requests processed
      setCurrentRequestIndex(0);
    }
    
    setShowRejectionInput(false);
    setRejectionReason('');
  };

  const handleTabPress = (tabName: string) => {
    if (tabName !== 'verify') {
      navigation.navigate(tabName);
    }
  };

  const pendingCount = verificationRequests.filter(req => req.status === 'pending').length;

  return (
    <LinearGradient
      colors={Colors.LandingScreenGradient}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingHorizontal: scale(16),
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Verify Hours</Text>
              <Text style={styles.headerSubtitle}>Review Member Submissions</Text>
            </View>
          </View>

          {/* Pending Count Badge */}
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
          </View>

          {/* Current Request Card */}
          {currentRequest && (
            <View style={styles.requestCard}>
              {/* Member Header */}
              <View style={styles.memberHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{currentRequest.memberInitials}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{currentRequest.memberName}</Text>
                  <Text style={styles.submittedTime}>Submitted {currentRequest.submittedTime}</Text>
                </View>
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingTagText}>Pending</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Event Details */}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Event</Text>
                    <Text style={styles.detailValue}>{currentRequest.eventName}</Text>
                    {currentRequest.eventType && (
                      <Text style={styles.detailSubValue}>{currentRequest.eventType}</Text>
                    )}
                  </View>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Hours</Text>
                    <Text style={styles.detailValue}>{currentRequest.hours} hours</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{currentRequest.date}</Text>
                  </View>
                </View>
              </View>

              {/* Notes Section */}
              <View style={styles.notesSection}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.notesText}>{currentRequest.notes}</Text>
              </View>

              {/* Proof of Service Section */}
              <View style={styles.proofSection}>
                <Text style={styles.detailLabel}>Proof of Service</Text>
                {currentRequest.proofImageUrl ? (
                  <TouchableOpacity style={styles.proofImageContainer}>
                    <Image 
                      source={{ uri: currentRequest.proofImageUrl }} 
                      style={styles.proofImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noProofContainer}>
                    <Icon name="image" size={moderateScale(24)} color={Colors.textLight} />
                    <Text style={styles.noProofText}>No proof image provided</Text>
                  </View>
                )}
              </View>

              {/* Rejection Reason Input */}
              {showRejectionInput && (
                <View style={styles.rejectionInputContainer}>
                  <Text style={styles.rejectionInputLabel}>Reason for Rejection (max 50 words)</Text>
                  <TextInput
                    style={styles.rejectionInput}
                    placeholder="Explain why these hours are being rejected..."
                    placeholderTextColor={Colors.textLight}
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={300} // Approximately 50 words
                  />
                  <Text style={styles.wordCount}>
                    {rejectionReason.split(/\s+/).filter(word => word.length > 0).length}/50 words
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.verifyButton]}
                  onPress={handleVerify}
                >
                  <Icon name="check" size={moderateScale(20)} color={Colors.white} />
                  <Text style={styles.verifyButtonText}>Verify</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleReject}
                >
                  <Icon name="close" size={moderateScale(20)} color={Colors.white} />
                  <Text style={styles.rejectButtonText}>
                    {showRejectionInput ? 'Confirm Reject' : 'Reject'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Request Counter */}
              <View style={styles.requestCounter}>
                <Text style={styles.requestCounterText}>
                  Request {currentRequestIndex + 1} of {verificationRequests.length}
                </Text>
              </View>
            </View>
          )}

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavigator onTabPress={handleTabPress} />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(16),
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
  },
  pendingBadge: {
    backgroundColor: Colors.pendingYellow,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(16),
    alignSelf: 'flex-start',
    marginBottom: verticalScale(20),
  },
  pendingBadgeText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.white,
  },
  requestCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
    backgroundColor: Colors.avatarBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  avatarText: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: Colors.white,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(2),
  },
  submittedTime: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
  },
  pendingTag: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  pendingTagText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dividerColor,
    marginVertical: verticalScale(16),
  },
  detailsSection: {
    marginBottom: verticalScale(20),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginBottom: verticalScale(4),
  },
  detailValue: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(2),
  },
  detailSubValue: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
  },
  notesSection: {
    marginBottom: verticalScale(20),
  },
  notesText: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    lineHeight: moderateScale(20),
    marginTop: verticalScale(4),
  },
  proofSection: {
    marginBottom: verticalScale(20),
  },
  proofImageContainer: {
    height: verticalScale(200),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    marginTop: verticalScale(8),
    overflow: 'hidden',
  },
  proofImage: {
    width: '100%',
    height: '100%',
  },
  noProofContainer: {
    height: verticalScale(100),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    marginTop: verticalScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dividerColor,
    borderStyle: 'dashed',
  },
  noProofText: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    marginTop: verticalScale(8),
  },
  rejectionInputContainer: {
    marginBottom: verticalScale(20),
  },
  rejectionInputLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.errorRed,
    marginBottom: verticalScale(8),
  },
  rejectionInput: {
    borderWidth: 1,
    borderColor: Colors.errorRed,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    fontSize: moderateScale(14),
    color: Colors.textDark,
    minHeight: verticalScale(80),
    textAlignVertical: 'top',
  },
  wordCount: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: verticalScale(4),
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    marginHorizontal: scale(6),
  },
  verifyButton: {
    backgroundColor: Colors.successGreen,
    shadowColor: Colors.successGreen,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  rejectButton: {
    backgroundColor: Colors.errorRed,
    shadowColor: Colors.errorRed,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  rejectButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  requestCounter: {
    alignItems: 'center',
  },
  requestCounterText: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default OfficerVerifyHours;