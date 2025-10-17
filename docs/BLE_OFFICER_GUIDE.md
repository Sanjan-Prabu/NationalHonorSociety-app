# BLE Attendance System - Officer Guide

## Overview

The BLE (Bluetooth Low Energy) Attendance System allows officers to create and manage attendance sessions using Bluetooth beacons. Members can automatically check in when they're within range of your device, making attendance tracking seamless and efficient.

## Getting Started

### Prerequisites

- **Device Requirements**: iOS 16+ or Android 12+ with Bluetooth LE support
- **Permissions**: Bluetooth and Location permissions must be granted
- **Role**: You must have Officer role in your organization (NHS or NHSA)
- **Network**: Internet connection required for session creation and monitoring

### Initial Setup

1. **Enable Bluetooth**: Ensure Bluetooth is turned on in your device settings
2. **Grant Permissions**: The app will request necessary permissions when you first use BLE features
3. **Verify Role**: Confirm you have officer privileges in the app

## Creating BLE Attendance Sessions

### Step-by-Step Process

1. **Navigate to Attendance**
   - Open the app and go to the "Attendance" tab
   - Tap "Create BLE Session" or use the BLE icon

2. **Configure Session Details**
   - **Title**: Enter a descriptive name (e.g., "Weekly Meeting", "Community Service Event")
   - **Duration**: Set how long the session should remain active (15 minutes to 4 hours)
   - **Start Time**: Sessions typically start immediately, but can be scheduled

3. **Start Broadcasting**
   - Tap "Start Session" to begin broadcasting
   - Your device will start advertising a BLE beacon
   - Members within ~30 meters can now auto-check in

### Session Configuration Options

#### Duration Settings
- **Quick Meeting**: 15-30 minutes
- **Regular Meeting**: 1-2 hours  
- **Extended Event**: 3-4 hours
- **Custom**: Set any duration up to 8 hours

#### Advanced Options
- **Auto-Stop**: Session ends automatically after duration
- **Manual Control**: You can stop the session early
- **Extend Session**: Add time to active sessions if needed

## Managing Active Sessions

### Session Dashboard

When a session is active, you'll see:
- **Session Status**: Broadcasting indicator and time remaining
- **Attendee Count**: Real-time count of checked-in members
- **Signal Strength**: BLE broadcast status and range estimate
- **Battery Impact**: Estimated battery usage

### Real-Time Monitoring

#### Attendee List
- View members as they check in automatically
- See check-in timestamps and method (BLE vs Manual)
- Export attendance list at any time

#### Session Controls
- **Pause/Resume**: Temporarily stop broadcasting
- **Extend Time**: Add more time to active session
- **Stop Session**: End session and stop broadcasting
- **Emergency Stop**: Immediately terminate all BLE activity

### Troubleshooting Active Sessions

#### Low Attendance Issues
1. **Check Signal Range**: Move to center of room/area
2. **Verify Member Setup**: Ensure members have auto-attendance enabled
3. **Bluetooth Interference**: Move away from WiFi routers or other devices
4. **Manual Backup**: Use manual check-in for members having issues

#### Technical Problems
1. **Broadcasting Stopped**: Check Bluetooth settings and restart session
2. **Battery Optimization**: Disable battery optimization for the app
3. **Permission Issues**: Re-grant Bluetooth and Location permissions
4. **App Crashes**: Force close and restart the app, then resume session

## Best Practices

### Before the Meeting

1. **Test Setup**: Start a test session 5-10 minutes early
2. **Inform Members**: Remind members to enable auto-attendance
3. **Backup Plan**: Have manual attendance ready as fallback
4. **Device Position**: Place device centrally in the meeting area

### During the Meeting

1. **Monitor Status**: Check the session dashboard periodically
2. **Handle Issues**: Help members with BLE problems manually check in
3. **Extend if Needed**: Add time if the meeting runs long
4. **Keep Device Active**: Avoid putting device to sleep or switching apps

### After the Meeting

1. **Stop Session**: End broadcasting to save battery
2. **Review Attendance**: Check the final attendee list
3. **Export Data**: Save attendance records if needed
4. **Report Issues**: Note any technical problems for IT support

## Security and Privacy

### Data Protection
- **No Personal Data**: BLE beacons only broadcast session codes
- **Organization Isolation**: Members only see sessions from their organization
- **Secure Tokens**: Session codes are cryptographically secure and expire automatically

### Access Control
- **Officer Only**: Only officers can create and manage sessions
- **Member Verification**: System verifies member organization before allowing check-in
- **Audit Trail**: All attendance submissions are logged with timestamps

## Troubleshooting Common Issues

### Session Won't Start

**Problem**: "Start Session" button doesn't work or shows error

**Solutions**:
1. Check Bluetooth is enabled in device settings
2. Grant all requested permissions (Bluetooth, Location)
3. Ensure you have officer role in the organization
4. Check internet connection for session creation
5. Restart the app and try again

### Members Can't Check In

**Problem**: Members report they can't auto-check in to your session

**Solutions**:
1. **Verify Range**: Ensure members are within 30 meters
2. **Check Member Setup**: Members must have auto-attendance enabled
3. **Organization Match**: Confirm members belong to same organization
4. **Bluetooth Issues**: Ask members to toggle Bluetooth off/on
5. **Manual Fallback**: Use manual check-in for affected members

### Poor Battery Life

**Problem**: Device battery drains quickly during BLE sessions

**Solutions**:
1. **Reduce Duration**: Use shorter session times when possible
2. **Optimize Settings**: Disable unnecessary background apps
3. **Power Management**: Connect to charger for long sessions
4. **Update App**: Ensure you have the latest version with battery optimizations

### Bluetooth Interference

**Problem**: Inconsistent beacon detection or range issues

**Solutions**:
1. **Change Location**: Move away from WiFi routers, microwaves, other Bluetooth devices
2. **Reduce Interference**: Ask attendees to close unnecessary Bluetooth connections
3. **Optimal Positioning**: Place device at table height, not on floor or high shelf
4. **Test Range**: Walk around room to verify coverage area

## Advanced Features

### Multi-Session Management
- Run multiple sessions for different groups simultaneously
- Each session has unique identifier and attendee list
- Manage all active sessions from single dashboard

### Integration with Events
- Link BLE sessions to scheduled events in the app
- Automatic attendance recording in event records
- Export attendance data for reporting and analysis

### Analytics and Reporting
- View session success rates and attendance patterns
- Monitor BLE system performance and reliability
- Generate reports for organization leadership

## Support and Contact

### Technical Support
- **In-App Help**: Use the help section for immediate assistance
- **IT Support**: Contact your organization's IT team for device issues
- **App Updates**: Keep the app updated for latest BLE improvements

### Feedback and Improvements
- Report bugs or suggest features through the app feedback system
- Share successful session strategies with other officers
- Participate in BLE system testing and improvement initiatives

---

*This guide covers the essential features of the BLE Attendance System. For additional help or advanced configurations, consult your organization's IT support team or the in-app help resources.*