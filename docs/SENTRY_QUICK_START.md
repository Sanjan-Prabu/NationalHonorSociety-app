# 🚀 Sentry Quick Start - 10 Minutes

Get Sentry running in your NHS App in just 10 minutes!

---

## ⚡ Quick Setup (10 minutes)

### **1. Create Sentry Account** (3 min)
1. Go to: https://sentry.io/signup/
2. Sign up (free plan)
3. Create project: **React Native**
4. Copy your **DSN** (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)

### **2. Add DSN to .env** (1 min)
Open `/Users/sanjanprabu/Documents/NationalHonorSociety/.env` and update:

```bash
EXPO_PUBLIC_SENTRY_DSN=https://YOUR_ACTUAL_DSN_HERE
```

Replace `YOUR_ACTUAL_DSN_HERE` with the DSN you copied from Sentry.

### **3. Restart App** (1 min)
```bash
# Stop current server (Ctrl+C)
npx expo start --clear
```

### **4. Verify It Works** (2 min)
Check console for:
```
[Sentry] Initialized successfully
[Sentry] Environment: development
```

### **5. Test Error Tracking** (3 min)
1. Go to Sentry dashboard: https://sentry.io/
2. Trigger a test error in your app (any crash)
3. Check Sentry → Issues → You should see the error!

---

## 🎯 What You Get

✅ **Real-time error tracking**
✅ **User context** (who experienced the error)
✅ **Full stack traces** (where the error occurred)
✅ **Device info** (iOS/Android, version, model)
✅ **Automatic alerts** (email notifications)

---

## 🔧 Configuration Options

### **Development (testing)**
```bash
EXPO_PUBLIC_SENTRY_ENABLED=false  # Don't send errors to Sentry
```

### **Production (live app)**
```bash
EXPO_PUBLIC_SENTRY_ENABLED=true   # Send all errors to Sentry
```

---

## 📊 Where to Check Errors

**Sentry Dashboard:** https://sentry.io/organizations/YOUR_ORG/issues/

You'll see:
- **Issues** - All errors
- **Performance** - App speed metrics
- **Releases** - Errors by app version
- **Alerts** - Email notifications

---

## 💰 Cost

**FREE TIER includes:**
- 5,000 errors/month
- 10,000 performance events/month
- 30-day data retention
- 1 user

**This is more than enough for your NHS app!**

---

## 🆘 Troubleshooting

**Sentry not working?**

1. Check DSN is set correctly in `.env`
2. Restart dev server: `npx expo start --clear`
3. Verify `EXPO_PUBLIC_SENTRY_ENABLED=true`

**Too many test errors?**

Set `EXPO_PUBLIC_SENTRY_ENABLED=false` in development.

---

## 📚 Full Documentation

See `SENTRY_SETUP_GUIDE.md` for complete details on:
- Production deployment
- Alert configuration
- Advanced features
- Best practices

---

## ✅ Done!

Sentry is now monitoring your app for errors. You'll get email alerts when issues occur!

**Next:** Deploy to production and monitor real user errors.
