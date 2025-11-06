# Quick Build Commands - Copy & Paste

## 🚀 Fastest Way to Build & Test

### **Option 1: Cloud Build (RECOMMENDED)**
```bash
cd /Users/sanjanprabu/Documents/NationalHonorSociety
eas build --profile development --platform ios
```
- ⏱️ Takes 5-10 minutes
- ☁️ Builds on Expo servers
- 📱 Download link provided
- ✅ No Xcode required

### **Option 2: Local Build**
```bash
cd /Users/sanjanprabu/Documents/NationalHonorSociety
eas build --profile development --platform ios --local
```
- ⏱️ Takes 15-25 minutes
- 💻 Builds on your Mac
- 📱 Creates .ipa file locally
- ⚠️ Requires Xcode installed

## 📦 Install on iPhone

### **After Cloud Build:**
1. Open link from EAS build output
2. Scan QR code with iPhone
3. Download and install

### **After Local Build:**
1. Open Xcode
2. Window > Devices and Simulators
3. Select iPhone
4. Drag .ipa to "Installed Apps"

## ✅ What You'll See

### **When Scanning Works:**
1. Tap "Enable Bluetooth" button
2. See **blue "Scanning..."** indicator
3. Toast: "Scanning... Looking for nearby sessions"
4. After 10 seconds:
   - **If sessions found**: "Session Found! Detected X nearby sessions"
   - **If no sessions**: "No Sessions Found - No active meetings detected nearby"

### **Console Logs (Success):**
```
[BLEHelper] ✅ iOS BeaconBroadcaster loaded successfully
[MemberBLEAttendance] ✅ Starting BLE listening
[MemberBLEAttendance] Scanning...
```

## 🔧 Prerequisites (One-Time Setup)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# That's it! Ready to build.
```

## 📋 Build Status

```bash
# Check all builds
eas build:list

# View specific build
eas build:view [build-id]
```

## 🎯 Testing Checklist

- [ ] Build completes successfully
- [ ] Install on iPhone
- [ ] Grant Bluetooth permissions
- [ ] See console logs: "✅ iOS BeaconBroadcaster loaded"
- [ ] Tap "Enable Bluetooth" button
- [ ] See "Scanning..." indicator (blue icon)
- [ ] Wait 10 seconds
- [ ] See "No Sessions Found" toast (if no officer nearby)
- [ ] Test with officer broadcasting
- [ ] Member detects session
- [ ] Member can join session
- [ ] Attendance recorded

## 💡 Pro Tips

1. **Use cloud build** - It's faster and handles everything
2. **Keep build installed** - Only rebuild when native code changes
3. **Test on real device** - BLE requires physical iPhone
4. **Check console logs** - Use Xcode Devices window

## 🆘 If Build Fails

```bash
# Clear everything
rm -rf node_modules
npm install

# Try cloud build (easier)
eas build --profile development --platform ios
```

## 📱 Expected Behavior

### **Member View:**
- Button press → **Scanning indicator appears**
- Blue icon with "Scanning..." text
- Toast: "Scanning... Looking for nearby sessions"
- 10 second timer
- Result toast: "Session Found!" or "No Sessions Found"

### **Officer View:**
- Unchanged - broadcasting works as before

## ⚡ One-Command Build & Test

```bash
# Build, wait, and get download link
eas build --profile development --platform ios && echo "✅ Build complete! Check link above to download."
```

That's it! Use cloud build for fastest results.
