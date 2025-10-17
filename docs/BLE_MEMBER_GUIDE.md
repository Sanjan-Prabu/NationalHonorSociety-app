# BLE Attendance System - Member Guide

## Overview

The BLE (Bluetooth Low Energy) Attendance System allows you to automatically check in to meetings and events when you're near an officer's device. No more manual sign-ins or QR codes - just enable auto-attendance and your device will handle check-ins automatically when you arrive.

## Getting Started

### Prerequisites

- **Device Requirements**: iOS 16+ or Android 12+ with Bluetooth LE support
- **Permissions**: Bluetooth and Location permissions must be granted
- **Membership**: Active membership in NHS or NHSA organization
- **Network**: Internet connection for initial setup and attendance submission

### Initial Setup

1. **Enable Bluetooth**: Turn on Bluetooth in your device settings
2. **Grant Permissions**: Allow the app to access Bluetooth and Location
3. **Enable Auto-Attendance**: Turn on the auto-attendance feature in the app
4. **Test Setup**: Verify everything works at your next meeting

## Enabling Auto-Attendance

### Step-by-Step Activation

1. **Open the App**: Launch the NHS/NHSA app
2. **Navigate to Attendance**: Go to the "Attendance" or "BLE" section
3. **Find Auto-Attendance**: Look for the "Auto-Attendance" toggle
4. **Enable Feature**: Turn on auto-attendance
5. **Grant Permissions**: Allow Bluetooth and Location access when prompted

### Permission Requirements

#### Bluetooth Permission
- **Purpose**: Detect nearby attendance sessions
- **When Used**: Only when auto-attendance is enabled
- **Privacy**: No personal data is transmitted via Bluetooth

#### Location Permission
- **Purpose**: Required by iOS/Android for Bluetooth scanning
- **When Used**: Only during attendance session detection
- **Privacy**: Your location is not tracked or stored

### Auto-Attendance Settings

#### Notification Preferences
- **Check-in Confirmation**: Get notified when you auto-check in
- **Session Detection**: Alert when attendance sessions are detected
- **Error Notifications**: Receive alerts if auto-check-in fails

#### Battery Optimization
- **Background Scanning**: Allow app to scan for sessions in background
- **Battery Saver Mode**: Reduce scanning frequency to save battery
- **Manual Override**: Disable auto-attendance to save battery when needed

## Using Auto-Attendance

### How It Works

1. **Officer Starts Session**: Officer creates and starts broadcasting a BLE session
2. **Automatic Detection**: Your device detects the session when you're within range (~30 meters)
3. **Auto Check-In**: App automatically submits your attendance
4. **Confirmation**: You receive confirmation that you've been checked in

### What You'll See

#### Session Detection
- **Notification**: "Attendance session detected for [Event Name]"
- **Auto Check-In**: "You've been automatically checked in"
- **Status Update**: Green checkmark in attendance history

#### In the App
- **Active Sessions**: See nearby sessions you can join
- **Attendance History**: View your check-in records with BLE indicator
- **Status Dashboard**: Current auto-attendance status and recent activity

### Manual Check-In Backup

If auto-attendance doesn't work:
1. **Manual Button**: Use the manual check-in option
2. **QR Code**: Scan QR code if provided by officer
3. **Officer Assistance**: Ask officer to manually add your attendance
4. **Report Issue**: Let officer know about the technical problem

## Troubleshooting

### Auto-Attendance Not Working

**Problem**: You're at a meeting but not getting checked in automatically

**Solutions**:
1. **Check Distance**: Move closer to the officer's device (within 30 meters)
2. **Verify Bluetooth**: Ensure Bluetooth is enabled in device settings
3. **Restart Scanning**: Toggle auto-attendance off and on
4. **Check Permissions**: Verify Bluetooth and Location permissions are granted
5. **Update App**: Make sure you have the latest app version

### No Sessions Detected

**Problem**: App shows no nearby attendance sessions

**Solutions**:
1. **Confirm Session Active**: Ask officer if BLE session is running
2. **Check Organization**: Ensure you're in the same organization (NHS vs NHSA)
3. **Bluetooth Reset**: Turn Bluetooth off and on in device settings
4. **App Restart**: Close and reopen the app
5. **Manual Check-In**: Use manual attendance as backup

### Permission Issues

**Problem**: App can't access Bluetooth or Location

**Solutions**:
1. **Grant Permissions**: Go to device Settings > Apps > NHS App > Permissions
2. **Enable Bluetooth**: Turn on Bluetooth in device settings
3. **Location Services**: Enable Location Services for the app
4. **Restart App**: Close and reopen app after granting permissions

### Battery Drain Concerns

**Problem**: Auto-attendance is using too much battery

**Solutions**:
1. **Battery Saver Mode**: Enable battery optimization in BLE settings
2. **Selective Use**: Only enable auto-attendance during meetings
3. **Background Limits**: Disable background app refresh if not needed
4. **Update App**: Newer versions have better battery optimization

## Privacy and Security

### What Data Is Shared

#### Via Bluetooth
- **Session Codes Only**: Only anonymous session identifiers are broadcast
- **No Personal Info**: Your name, ID, or other personal data is never transmitted via BLE
- **Organization Codes**: Only your organization's sessions are visible to you

#### Via Internet
- **Attendance Records**: Check-in time and event information
- **Organization Data**: Your membership status and organization affiliation
- **Error Logs**: Anonymous technical data for troubleshooting

### Data Protection
- **Encrypted Communication**: All internet data is encrypted
- **Organization Isolation**: You only see sessions from your organization
- **Automatic Expiration**: Session codes expire automatically for security

## Best Practices

### Before Meetings

1. **Check Settings**: Verify auto-attendance is enabled
2. **Test Bluetooth**: Ensure Bluetooth is working properly
3. **Charge Device**: Make sure you have sufficient battery
4. **Update App**: Keep the app updated for best performance

### During Meetings

1. **Stay in Range**: Remain within reasonable distance of officer's device
2. **Keep App Active**: Don't force-close the app during meetings
3. **Monitor Status**: Check for check-in confirmation
4. **Report Issues**: Let officer know immediately if auto-check-in fails

### After Meetings

1. **Verify Attendance**: Check that your attendance was recorded
2. **Disable if Needed**: Turn off auto-attendance to save battery
3. **Report Problems**: Provide feedback on any technical issues

## Advanced Features

### Multiple Organizations
- If you're in both NHS and NHSA, the app will automatically detect which organization's session you're attending
- Auto-attendance works independently for each organization

### Background Operation
- Auto-attendance works even when the app is in the background
- You'll receive notifications when you're automatically checked in
- Battery optimization ensures minimal impact on device performance

### Attendance History
- View all your attendance records with method indicators (BLE, Manual, QR)
- Export your attendance history for personal records
- See statistics on your meeting attendance patterns

## Frequently Asked Questions

### Q: Does auto-attendance work if my phone is in my pocket/bag?
**A:** Yes, BLE signals can penetrate clothing and bags. Keep your device with you for best results.

### Q: What if I arrive late to a meeting?
**A:** Auto-attendance works throughout the entire session duration. You'll be checked in automatically whenever you arrive, as long as the session is still active.

### Q: Can I be checked in to multiple sessions at once?
**A:** No, the system prevents duplicate check-ins. You'll only be recorded once per session, even if you leave and return.

### Q: What happens if I forget to enable auto-attendance?
**A:** You can still check in manually using the manual check-in button or by asking the officer to add your attendance.

### Q: Does this work with all smartphones?
**A:** The feature requires iOS 16+ or Android 12+ with Bluetooth LE support. Most modern smartphones support this technology.

### Q: How much battery does auto-attendance use?
**A:** Battery usage is minimal thanks to BLE's low-energy design. Typical usage adds less than 5% to daily battery consumption.

## Support and Help

### Getting Help
- **In-App Support**: Use the help section for immediate assistance
- **Officer Assistance**: Ask your meeting officer for help with technical issues
- **IT Support**: Contact your organization's IT team for persistent problems

### Reporting Issues
- **Bug Reports**: Use the app's feedback system to report technical problems
- **Feature Requests**: Suggest improvements through the feedback system
- **Success Stories**: Share positive experiences to help improve the system

---

*This guide covers everything you need to know about using the BLE Attendance System as a member. For additional help, consult the in-app help resources or ask your organization's officers for assistance.*