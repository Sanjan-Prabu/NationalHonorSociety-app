# App Store Metadata and Permissions Documentation

## App Store Listing Information

### App Name
**Primary**: National Honor Society
**Alternative**: NHS/NHSA Attendance Tracker

### App Description

#### Short Description (80 characters)
Official NHS/NHSA app with automatic Bluetooth attendance tracking for events.

#### Full Description

The official National Honor Society (NHS) and National Honor Society of Arts (NHSA) mobile application provides seamless attendance tracking and member management for high school honor society chapters.

**Key Features:**
• **Automatic BLE Attendance**: Officers can broadcast attendance sessions via Bluetooth Low Energy, allowing members to check in automatically when they arrive at meetings and events
• **Multi-Organization Support**: Supports both NHS and NHSA chapters with secure organization isolation
• **Real-Time Monitoring**: Officers can monitor attendance in real-time as members arrive
• **Volunteer Hour Tracking**: Log and track community service hours with approval workflows
• **Event Management**: Create, manage, and track attendance for meetings and events
• **Secure Authentication**: Role-based access with officer and member permissions
• **Cross-Platform**: Works seamlessly on both iOS and Android devices

**BLE Attendance System:**
The innovative Bluetooth Low Energy attendance system eliminates manual check-ins and QR codes. Officers simply start a session, and members are automatically checked in when they arrive within range. The system maintains strict security with organization isolation and encrypted session tokens.

**Privacy & Security:**
• No personal data transmitted via Bluetooth
• Organization-specific session isolation
• Encrypted data transmission
• Automatic session expiration
• Role-based access controls

Perfect for NHS and NHSA chapters looking to modernize their attendance tracking while maintaining security and ease of use.

### Keywords
NHS, NHSA, National Honor Society, attendance, Bluetooth, BLE, automatic check-in, volunteer hours, student organization, high school, honor society, meeting tracker

### Category
**Primary**: Education
**Secondary**: Productivity

### Age Rating
**iOS**: 4+ (No Objectionable Content)
**Android**: Everyone

### Screenshots Required

#### iPhone Screenshots (6.7" Display)
1. **Login/Landing Screen**: Show organization selection and secure login
2. **Member Dashboard**: Display upcoming events and attendance history
3. **BLE Auto-Attendance**: Show auto-attendance toggle and session detection
4. **Officer Dashboard**: Display session management and real-time monitoring
5. **Event Management**: Show event creation and attendance tracking

#### Android Screenshots (Phone)
1. **Welcome Screen**: Organization selection and app overview
2. **Member Home**: Event list and quick actions
3. **Auto-Attendance Setup**: Permission setup and BLE configuration
4. **Officer Session**: Active session with attendee monitoring
5. **Volunteer Hours**: Hour logging and approval interface

### App Preview Videos (Optional)
1. **30-second overview**: Show complete BLE attendance workflow
2. **Feature highlight**: Demonstrate automatic check-in process

## Permission Justifications

### iOS Permissions (Info.plist)

#### NSBluetoothAlwaysUsageDescription
**Text**: "This app uses Bluetooth to enable automatic attendance tracking when you're near NHS/NHSA events. This allows for seamless check-in without manual intervention."

**Justification**: Required for BLE beacon detection and broadcasting for the automatic attendance system. Core feature of the application.

#### NSBluetoothPeripheralUsageDescription
**Text**: "This app uses Bluetooth to broadcast attendance sessions for NHS/NHSA events, allowing members to automatically check in when nearby."

**Justification**: Enables officers to broadcast attendance sessions via BLE beacons. Essential for the automatic attendance feature.

#### NSLocationWhenInUseUsageDescription
**Text**: "This app uses location services to detect nearby NHS/NHSA attendance sessions via Bluetooth beacons for automatic check-in."

**Justification**: iOS requires location permission for BLE scanning. No actual location data is collected or stored.

#### NSLocationAlwaysAndWhenInUseUsageDescription
**Text**: "This app uses location services to detect nearby NHS/NHSA attendance sessions via Bluetooth beacons for automatic check-in, even when the app is in the background."

**Justification**: Enables background BLE scanning for automatic attendance when app is not in foreground.

### Android Permissions

#### BLUETOOTH & BLUETOOTH_ADMIN
**Justification**: Basic Bluetooth access for BLE operations (legacy permissions for older Android versions).

#### BLUETOOTH_ADVERTISE
**Justification**: Required for officers to broadcast BLE attendance sessions (Android 12+).

#### BLUETOOTH_CONNECT
**Justification**: Required for BLE device connections and operations (Android 12+).

#### BLUETOOTH_SCAN
**Justification**: Required for members to scan for nearby attendance sessions (Android 12+).

#### ACCESS_FINE_LOCATION & ACCESS_COARSE_LOCATION
**Justification**: Android requires location permissions for BLE scanning. No location data is collected or stored.

#### FOREGROUND_SERVICE
**Justification**: Enables reliable BLE operations during active attendance sessions.

#### WAKE_LOCK
**Justification**: Prevents device from sleeping during active BLE broadcasting sessions.

## Privacy Policy Requirements

### Data Collection Statement
"The NHS/NHSA app collects minimal data necessary for attendance tracking and member management. Bluetooth Low Energy is used only for proximity detection - no personal information is transmitted via Bluetooth."

### Data Usage
- **Attendance Records**: Stored securely for organizational record-keeping
- **User Profiles**: Basic member information for authentication and role management
- **Bluetooth Data**: Only anonymous session tokens transmitted via BLE
- **Location**: Required by iOS/Android for BLE scanning but not collected or stored

### Data Sharing
"No personal data is shared with third parties. All data remains within the secure NHS/NHSA system infrastructure."

### Data Retention
"Attendance and member data is retained according to organizational policies. Users can request data deletion by contacting their chapter advisor."

## App Store Review Guidelines Compliance

### iOS App Store Guidelines

#### 2.1 App Completeness
- App is fully functional with all BLE features working
- No placeholder content or broken features
- Comprehensive error handling and fallback options

#### 2.3 Accurate Metadata
- All descriptions accurately reflect app functionality
- Screenshots show actual app interface
- Keywords are relevant and not misleading

#### 2.5.1 Software Requirements
- Uses only public APIs
- Compatible with latest iOS versions
- Follows iOS design guidelines

#### 5.1.1 Privacy - Data Collection and Storage
- Clear privacy policy explaining data usage
- Transparent about Bluetooth and location permission usage
- No unnecessary data collection

### Google Play Store Guidelines

#### Device and Network Abuse
- BLE usage is clearly explained and justified
- No excessive battery usage or performance impact
- Proper permission handling and user consent

#### User Data
- Minimal data collection with clear purpose
- Secure data transmission and storage
- User control over data and permissions

#### Permissions
- All permissions have clear justification
- Runtime permission requests with explanations
- Graceful handling of denied permissions

## Technical Requirements

### Minimum System Requirements

#### iOS
- **Version**: iOS 16.0 or later
- **Hardware**: iPhone 6s or later (BLE 4.0+ support)
- **Storage**: 50 MB available space
- **Network**: Internet connection required for initial setup and data sync

#### Android
- **Version**: Android 12.0 (API level 31) or later
- **Hardware**: BLE 4.0+ support, 2GB RAM minimum
- **Storage**: 100 MB available space
- **Network**: Internet connection required for initial setup and data sync

### Performance Specifications
- **App Launch**: <3 seconds on supported devices
- **BLE Detection**: <5 seconds for beacon detection
- **Battery Impact**: <5% additional drain per hour during active use
- **Memory Usage**: <150 MB peak memory usage

### Accessibility Compliance
- **VoiceOver/TalkBack**: Full screen reader support
- **Dynamic Type**: Supports system font size preferences
- **High Contrast**: Compatible with system accessibility settings
- **Color Blind**: No color-only information conveyance

## Localization

### Supported Languages
- **Primary**: English (US)
- **Future**: Spanish, French (based on user demand)

### Localization Requirements
- All user-facing text externalized to string resources
- Date/time formatting respects system locale
- Number formatting follows regional conventions
- BLE permission descriptions localized appropriately

## Marketing Assets

### App Icon Requirements
- **iOS**: 1024x1024 PNG without transparency
- **Android**: 512x512 PNG with optional transparency
- **Design**: NHS/NHSA branding with clear, recognizable symbol

### Feature Graphic (Android)
- **Size**: 1024x500 PNG
- **Content**: Showcase BLE attendance feature with device mockups
- **Text**: Minimal text overlay, focus on visual demonstration

### Promotional Text (Android)
"Revolutionary Bluetooth attendance tracking for NHS/NHSA chapters. Automatic check-ins, real-time monitoring, and seamless member management."

## Release Notes Template

### Version 1.0.0 - Initial Release
- Automatic Bluetooth Low Energy attendance tracking
- Multi-organization support for NHS and NHSA chapters
- Real-time attendance monitoring for officers
- Secure member authentication and role management
- Volunteer hour tracking and approval workflows
- Cross-platform compatibility (iOS 16+, Android 12+)

### Future Release Template
**Version X.X.X - [Release Name]**
- New features and improvements
- Bug fixes and performance enhancements
- Security updates and compliance improvements
- User experience enhancements

## Compliance and Legal

### Educational Privacy Laws
- **FERPA Compliance**: No educational records stored or transmitted
- **COPPA Compliance**: Age-appropriate design and data handling
- **State Privacy Laws**: Compliance with applicable state student privacy regulations

### Accessibility Laws
- **ADA Compliance**: Full accessibility feature support
- **Section 508**: Government accessibility standards compliance
- **WCAG 2.1**: Web Content Accessibility Guidelines compliance

### International Compliance
- **GDPR**: European data protection regulation compliance
- **CCPA**: California Consumer Privacy Act compliance
- **Privacy Shield**: International data transfer compliance

This documentation ensures proper app store submission and compliance with all relevant guidelines and regulations for the NHS/NHSA BLE attendance application.