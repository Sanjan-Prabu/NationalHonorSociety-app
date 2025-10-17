# BLE Testing Checklist

## Pre-Testing Setup

### Environment Preparation
- [ ] Development clients built and installed on test devices
- [ ] Supabase database accessible and configured
- [ ] Test user accounts created for both NHS and NHSA
- [ ] BLE scanner apps installed for debugging
- [ ] Test devices have Bluetooth enabled
- [ ] Location permissions granted on all devices

### Test Device Requirements
- [ ] Minimum 2 devices (1 officer, 1 member)
- [ ] Both Android and iOS devices for cross-platform testing
- [ ] Devices support BLE (iPhone 4S+, Android 4.3+)
- [ ] Devices within 30m range for testing
- [ ] Battery levels >50% for extended testing

## Functional Testing

### Officer Device Tests (Broadcasting)

#### Session Creation
- [ ] Officer can create new attendance session
- [ ] Session title and duration are configurable
- [ ] Session appears in database with correct organization
- [ ] Session token is generated and stored
- [ ] Session expiration time is calculated correctly

#### Broadcasting Controls
- [ ] "Start Broadcasting" button initiates BLE advertising
- [ ] Bluetooth permission request appears (first time)
- [ ] Broadcasting status indicator shows "Active"
- [ ] "Stop Broadcasting" button terminates advertising
- [ ] Broadcasting automatically stops when session expires

#### Session Monitoring
- [ ] Real-time attendance count updates
- [ ] Member names appear as they check in
- [ ] Session timer counts down correctly
- [ ] Session can be manually ended early
- [ ] Attendance data persists after session ends

### Member Device Tests (Scanning)

#### Auto-Attendance Setup
- [ ] Member can enable auto-attendance feature
- [ ] Bluetooth permission request appears (first time)
- [ ] Location permission request appears (first time)
- [ ] Auto-attendance status indicator shows "Enabled"
- [ ] Member can disable auto-attendance

#### Beacon Detection
- [ ] Member device detects nearby attendance sessions
- [ ] Only sessions from member's organization are detected
- [ ] Detection notification appears when beacon found
- [ ] Attendance is automatically submitted
- [ ] Confirmation message shows successful check-in

#### Manual Fallback
- [ ] Manual check-in option available when BLE fails
- [ ] Manual check-in works when Bluetooth disabled
- [ ] Manual check-in respects organization boundaries
- [ ] Manual and auto attendance are clearly distinguished

## Cross-Platform Testing

### Android Officer → iOS Member
- [ ] Android device successfully broadcasts beacon
- [ ] iOS device detects Android-broadcasted beacon
- [ ] Attendance submission works cross-platform
- [ ] No data corruption or format issues

### iOS Officer → Android Member
- [ ] iOS device successfully broadcasts beacon
- [ ] Android device detects iOS-broadcasted beacon
- [ ] Attendance submission works cross-platform
- [ ] Beacon payload format is consistent

### Multi-Device Scenarios
- [ ] Multiple members can detect same session
- [ ] Multiple concurrent sessions don't interfere
- [ ] Session isolation between organizations works
- [ ] Performance remains stable with multiple devices

## Organization Isolation Testing

### NHS vs NHSA Separation
- [ ] NHS members only detect NHS sessions
- [ ] NHSA members only detect NHSA sessions
- [ ] Cross-organization attendance is blocked
- [ ] Organization codes are correctly encoded in beacons
- [ ] Database RLS policies prevent unauthorized access

### Multi-Organization Scenarios
- [ ] Concurrent NHS and NHSA sessions work independently
- [ ] Members switching organizations see correct sessions
- [ ] Session tokens are unique across organizations
- [ ] Attendance records maintain organization context

## Error Handling Testing

### Permission Scenarios
- [ ] Bluetooth permission denied - graceful fallback
- [ ] Location permission denied - appropriate error message
- [ ] Permission revoked during operation - proper handling
- [ ] Permission re-granted - automatic recovery

### Bluetooth State Changes
- [ ] Bluetooth disabled during scanning - error handling
- [ ] Bluetooth disabled during broadcasting - session cleanup
- [ ] Bluetooth re-enabled - automatic reconnection
- [ ] Airplane mode toggled - proper state management

### Network Connectivity
- [ ] Offline attendance queued for later submission
- [ ] Network reconnection triggers queued submissions
- [ ] Partial network failures handled gracefully
- [ ] Database connection errors show user-friendly messages

### Edge Cases
- [ ] Session expires during active broadcasting
- [ ] Member leaves range during check-in process
- [ ] Duplicate beacon detections handled correctly
- [ ] Invalid session tokens rejected properly
- [ ] Malformed beacon data doesn't crash app

## Performance Testing

### Battery Usage
- [ ] Baseline battery usage measured (no BLE)
- [ ] BLE scanning battery impact <5% per hour
- [ ] BLE broadcasting battery impact <10% per hour
- [ ] Background scanning optimized for battery life
- [ ] Battery usage acceptable for typical event duration (2-3 hours)

### Memory Usage
- [ ] Memory usage stable during extended operation
- [ ] No memory leaks detected after multiple sessions
- [ ] Memory usage <100MB during normal operation
- [ ] Proper cleanup when stopping BLE operations
- [ ] No crashes due to memory pressure

### Range and Reliability
- [ ] Detection reliable at 1m distance (>95% success)
- [ ] Detection works at 5m distance (>90% success)
- [ ] Detection works at 10m distance (>80% success)
- [ ] Detection possible at 20m distance (>50% success)
- [ ] Maximum range documented and communicated

### Concurrent Usage
- [ ] Multiple members scanning simultaneously
- [ ] Multiple officers broadcasting simultaneously
- [ ] Performance stable with 10+ concurrent users
- [ ] No interference between nearby sessions
- [ ] Session capacity limits documented

## Security Testing

### Session Token Security
- [ ] Session tokens are cryptographically secure
- [ ] Token collision probability is negligible
- [ ] Tokens expire properly server-side
- [ ] Invalid tokens are rejected
- [ ] Token format validation prevents injection

### Data Privacy
- [ ] No personal data transmitted via BLE
- [ ] Only organization code and session token in beacon
- [ ] Attendance data encrypted in transit
- [ ] Database access properly authenticated
- [ ] Audit trail maintained for all operations

### Attack Resistance
- [ ] Replay attacks prevented by session expiration
- [ ] Beacon spoofing doesn't grant unauthorized access
- [ ] SQL injection attempts blocked
- [ ] Rate limiting prevents abuse
- [ ] Error messages don't leak sensitive information

## User Experience Testing

### Officer Workflow
- [ ] Session creation is intuitive and quick (<30 seconds)
- [ ] Broadcasting status is clearly visible
- [ ] Attendance monitoring is real-time and accurate
- [ ] Session management controls are accessible
- [ ] Error messages are helpful and actionable

### Member Workflow
- [ ] Auto-attendance setup is straightforward
- [ ] Detection notifications are timely and clear
- [ ] Check-in confirmation provides confidence
- [ ] Manual fallback is easily accessible
- [ ] Settings are persistent across app restarts

### Accessibility
- [ ] All BLE features work with screen readers
- [ ] Color-blind users can distinguish status indicators
- [ ] Large text settings don't break layouts
- [ ] Voice control works for primary actions
- [ ] Keyboard navigation available where applicable

## Integration Testing

### Database Integration
- [ ] Attendance records created with correct schema
- [ ] Foreign key relationships maintained
- [ ] RLS policies enforced correctly
- [ ] Concurrent access handled properly
- [ ] Data consistency maintained under load

### Real-Time Updates
- [ ] Officer sees member check-ins immediately
- [ ] Member sees session updates in real-time
- [ ] WebSocket connections stable during BLE operations
- [ ] Subscription cleanup prevents memory leaks
- [ ] Offline changes sync when reconnected

### Authentication Integration
- [ ] BLE operations respect user authentication
- [ ] Session creation requires officer role
- [ ] Member attendance requires active membership
- [ ] Token refresh doesn't interrupt BLE operations
- [ ] Logout properly cleans up BLE state

## Regression Testing

### Core App Functionality
- [ ] Manual attendance entry still works
- [ ] Event creation/management unaffected
- [ ] User authentication flows unchanged
- [ ] Navigation between screens smooth
- [ ] App startup time not significantly impacted

### Existing Features
- [ ] Push notifications still work
- [ ] File uploads/downloads functional
- [ ] Search functionality intact
- [ ] Settings persistence maintained
- [ ] Offline mode compatibility preserved

## Documentation Testing

### User Documentation
- [ ] Officer guide is accurate and complete
- [ ] Member guide covers all scenarios
- [ ] Troubleshooting steps are effective
- [ ] Screenshots match current UI
- [ ] Installation instructions work

### Developer Documentation
- [ ] API documentation is current
- [ ] Code examples compile and run
- [ ] Architecture diagrams are accurate
- [ ] Deployment instructions complete
- [ ] Testing procedures documented

## Sign-Off Criteria

### Functional Requirements
- [ ] All core BLE functionality working
- [ ] Cross-platform compatibility verified
- [ ] Organization isolation confirmed
- [ ] Error handling comprehensive
- [ ] Performance within acceptable limits

### Quality Requirements
- [ ] No critical or high-severity bugs
- [ ] Battery usage optimized
- [ ] Memory leaks resolved
- [ ] Security vulnerabilities addressed
- [ ] User experience polished

### Documentation Requirements
- [ ] User guides complete and tested
- [ ] Developer documentation current
- [ ] Troubleshooting guide comprehensive
- [ ] Deployment procedures validated
- [ ] Training materials prepared

## Post-Testing Actions

### Bug Tracking
- [ ] All issues logged in tracking system
- [ ] Severity and priority assigned
- [ ] Reproduction steps documented
- [ ] Screenshots/videos attached
- [ ] Assignment and timeline set

### Performance Baseline
- [ ] Performance metrics documented
- [ ] Baseline measurements recorded
- [ ] Monitoring alerts configured
- [ ] Regression test suite updated
- [ ] Performance targets validated

### Release Preparation
- [ ] Release notes drafted
- [ ] Feature flags configured
- [ ] Rollback procedures tested
- [ ] Monitoring dashboards ready
- [ ] Support team trained