# 🏗️ LOCAL BUILD & SUBMIT COMMANDS

## ✅ All Changes Complete!

### **What Was Changed:**
1. ✅ Removed DEV tag from UI
2. ✅ Changed label from "Duration (minutes, max 20)" to "Duration (max 20)"
3. ✅ Added red border when duration > 20
4. ✅ Added error message "Maximum 20 minutes allowed" in red
5. ✅ Updated build number from 13/14 to **15** in both app.json and app.config.js

---

## 📱 LOCAL BUILD COMMANDS (Saves Cloud Build Minutes!)

### **Step 1: Build Locally**
```bash
# Build for iOS locally (no cloud minutes used!)
eas build --platform ios --profile preview --local

# This will:
# - Build on your Mac (requires Xcode)
# - Use build number 15 automatically
# - Create an .ipa file locally
# - Save your EAS cloud build minutes!
```

### **Step 2: Submit to TestFlight**
```bash
# After local build completes, submit to TestFlight
eas submit --platform ios --latest

# This will:
# - Use the locally built .ipa file
# - Submit to App Store Connect
# - Make it available in TestFlight
# - Only uses minimal cloud resources for submission
```

---

## 🚀 ALTERNATIVE: If Local Build Doesn't Work

If you don't have Xcode or local build fails, use cloud build:

```bash
# Cloud build (uses EAS minutes)
eas build --platform ios --profile preview

# Then submit
eas submit --platform ios --latest
```

---

## 📋 WHAT HAPPENS:

### **During Local Build:**
1. EAS CLI downloads dependencies
2. Builds on your Mac using Xcode
3. Creates signed .ipa file
4. Stores build artifact locally
5. **NO cloud build minutes used!** ✅

### **During Submit:**
1. Uploads .ipa to App Store Connect
2. Processes through Apple's systems
3. Appears in TestFlight within 5-10 minutes
4. Uses minimal cloud resources (just upload)

---

## 🔧 REQUIREMENTS FOR LOCAL BUILD:

### **You Need:**
- ✅ macOS (you have this)
- ✅ Xcode installed (check with `xcode-select -p`)
- ✅ Apple Developer account (you have this)
- ✅ EAS CLI installed (you have this)

### **If Xcode Not Installed:**
```bash
# Install Xcode from App Store (it's free)
# Or install Command Line Tools only:
xcode-select --install
```

---

## 💡 WHY LOCAL BUILD IS BETTER:

| Feature | Local Build | Cloud Build |
|---------|-------------|-------------|
| **Cost** | FREE | Uses EAS minutes |
| **Speed** | Faster (your Mac) | Slower (queue) |
| **Control** | Full control | Limited |
| **Requirements** | Needs Xcode | None |

---

## 🎯 RECOMMENDED WORKFLOW:

```bash
# 1. Build locally (FREE!)
eas build --platform ios --profile preview --local

# 2. Wait for build to complete (10-15 minutes)
# You'll see: "Build completed!"

# 3. Submit to TestFlight
eas submit --platform ios --latest

# 4. Check TestFlight in 5-10 minutes
# Build 15 will appear!
```

---

## 🐛 TROUBLESHOOTING:

### **If local build fails:**
```bash
# Try cloud build instead
eas build --platform ios --profile preview
```

### **If submit fails:**
```bash
# Specify the build ID manually
eas submit --platform ios --id <build-id>
```

### **If build number doesn't increment:**
```bash
# It's already set to 15 in app.json and app.config.js
# EAS will use 15 automatically
```

---

## ✅ CURRENT BUILD CONFIGURATION:

- **Build Number:** 15 (updated from 13)
- **Version:** 1.0.0
- **Profile:** preview (internal distribution)
- **Platform:** iOS
- **Distribution:** TestFlight

---

## 🎉 YOU'RE READY!

Just run the commands above and you'll have:
- ✅ No DEV tag
- ✅ Clean duration label
- ✅ Red error for duration > 20
- ✅ Build number 15
- ✅ Saved cloud build minutes!

**Run the local build command now!** 🚀
