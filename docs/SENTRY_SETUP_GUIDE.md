# 🔍 Sentry Integration Guide

Complete guide for setting up Sentry error monitoring in the NHS App.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What is Sentry?](#what-is-sentry)
3. [Setup Steps](#setup-steps)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Sentry is now integrated into your NHS App to provide:

- **Real-time error tracking** - Get notified immediately when errors occur
- **User context** - See which users are affected by errors
- **Stack traces** - Full error details for debugging
- **Performance monitoring** - Track app performance metrics
- **Release tracking** - Monitor errors by app version
- **Environment separation** - Different tracking for dev/staging/production

---

## 🤔 What is Sentry?

Sentry is an error monitoring platform that helps you:

1. **Catch errors before users report them**
2. **Understand the context** (user, device, actions leading to error)
3. **Fix issues faster** with detailed stack traces
4. **Track error trends** over time
5. **Set up alerts** for critical errors

**Cost:** Free tier includes:
- 5,000 errors/month
- 10,000 performance transactions/month
- 1 user
- 30-day data retention

This is **more than enough** for your NHS app!

---

## 🚀 Setup Steps

### **Step 1: Create Sentry Account** (5 minutes)

1. Go to: https://sentry.io/signup/
2. Sign up with your email
3. Choose **Free Plan** (Developer tier)
4. Verify your email

### **Step 2: Create Project** (3 minutes)

1. Click **"Create Project"**
2. Select platform: **React Native**
3. Set alert frequency: **On every new issue** (recommended)
4. Project name: `nhs-app` (or your choice)
5. Click **"Create Project"**

### **Step 3: Get Your DSN** (1 minute)

After creating the project, you'll see a setup page with your DSN.

**DSN Format:**
```
https://xxxxxxxxxxxxxxxxxxxxx@xxxxxxxxxxxxx.ingest.sentry.io/xxxxxxx
```

**Copy this DSN** - you'll need it in the next step!

**To find it later:**
- Go to **Settings** → **Projects** → **nhs-app** → **Client Keys (DSN)**

### **Step 4: Configure Environment Variables** (2 minutes)

1. Open your `.env` file
2. Replace `YOUR_SENTRY_DSN_HERE` with your actual DSN:

```bash
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=https://your-actual-dsn-here@sentry.io/12345
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development
EXPO_PUBLIC_SENTRY_ENABLED=true
```

**Example:**
```bash
EXPO_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7890123
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development
EXPO_PUBLIC_SENTRY_ENABLED=true
```

### **Step 5: Restart Your App** (1 minute)

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npx expo start --clear
```

---

## ⚙️ Configuration

### **Environment Variables Explained**

| Variable | Description | Values |
|----------|-------------|--------|
| `EXPO_PUBLIC_SENTRY_DSN` | Your Sentry project DSN | From Sentry dashboard |
| `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | Current environment | `development`, `staging`, `production` |
| `EXPO_PUBLIC_SENTRY_ENABLED` | Enable/disable Sentry | `true` or `false` |

### **Environment-Specific Configuration**

**Development (.env):**
```bash
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/12345
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development
EXPO_PUBLIC_SENTRY_ENABLED=false  # Disable in dev to avoid noise
```

**Production (.env.production):**
```bash
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/12345
EXPO_PUBLIC_SENTRY_ENVIRONMENT=production
EXPO_PUBLIC_SENTRY_ENABLED=true  # Enable in production
```

### **What Gets Tracked?**

✅ **Automatically tracked:**
- JavaScript errors
- Unhandled promise rejections
- React component errors (via Error Boundaries)
- Network errors
- User actions (breadcrumbs)
- User context (ID, email, username)
- Organization context
- Device info (platform, version, model)
- App version and build number

❌ **Filtered out (for privacy):**
- Authorization headers
- API keys
- Passwords
- Tokens
- Console logs in production

---

## 🧪 Testing

### **Test 1: Verify Sentry is Initialized**

1. Start your app:
   ```bash
   npx expo start
   ```

2. Check the console for:
   ```
   [Sentry] Initialized successfully
   [Sentry] Environment: development
   [Sentry] Release: nhs-app@1.0.0
   ```

### **Test 2: Trigger a Test Error**

Add this temporary button to any screen:

```typescript
import SentryService from '../services/SentryService';

// In your component:
<TouchableOpacity onPress={() => {
  SentryService.captureMessage('Test error from NHS App!', 'info');
}}>
  <Text>Test Sentry</Text>
</TouchableOpacity>
```

**Expected result:**
- Console shows: `[Sentry] Message captured`
- Check Sentry dashboard → Issues → You should see the test message

### **Test 3: Trigger a Real Error**

```typescript
<TouchableOpacity onPress={() => {
  throw new Error('Test crash for Sentry');
}}>
  <Text>Crash Test</Text>
</TouchableOpacity>
```

**Expected result:**
- App shows error boundary
- Sentry dashboard shows the error with full stack trace

### **Test 4: Verify User Context**

1. Log in to the app
2. Trigger an error
3. Check Sentry dashboard → Click on the error
4. You should see:
   - User ID
   - User email
   - Username/display name

---

## 🚀 Production Deployment

### **Before Deploying to Production:**

1. **Create production environment in Sentry:**
   - Settings → Environments → Add `production`

2. **Update .env.production:**
   ```bash
   EXPO_PUBLIC_SENTRY_ENVIRONMENT=production
   EXPO_PUBLIC_SENTRY_ENABLED=true
   ```

3. **Set up release tracking:**
   - Sentry will automatically track releases using your app version
   - Format: `nhs-app@1.0.0`

4. **Configure EAS Build:**
   
   In `eas.json`, ensure environment variables are set:
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_SENTRY_ENVIRONMENT": "production",
           "EXPO_PUBLIC_SENTRY_ENABLED": "true"
         }
       }
     }
   }
   ```

5. **Build and deploy:**
   ```bash
   eas build --platform all --profile production
   ```

---

## 📊 Monitoring & Alerts

### **Set Up Alerts**

1. Go to **Settings** → **Alerts**
2. Click **"Create Alert Rule"**
3. Recommended alerts:

**Alert 1: New Issues**
- Condition: A new issue is created
- Action: Send email to your email
- Frequency: Immediately

**Alert 2: High Error Rate**
- Condition: Error count > 10 in 1 hour
- Action: Send email
- Frequency: At most once per hour

**Alert 3: Critical Errors**
- Condition: Issue level is `error` or `fatal`
- Action: Send email + Slack (if configured)
- Frequency: Immediately

### **Dashboard Widgets**

Recommended widgets for your Sentry dashboard:

1. **Error Frequency** - Track errors over time
2. **Top Issues** - Most common errors
3. **Affected Users** - How many users hit errors
4. **Release Health** - Error rate by app version

### **Weekly Reports**

Enable weekly email reports:
- Settings → Account → Notifications
- Enable "Weekly Reports"

---

## 🔧 Troubleshooting

### **Issue: Sentry not initializing**

**Symptoms:**
- No console log: `[Sentry] Initialized successfully`

**Solutions:**
1. Check DSN is set in `.env`:
   ```bash
   echo $EXPO_PUBLIC_SENTRY_DSN
   ```

2. Restart dev server with cache clear:
   ```bash
   npx expo start --clear
   ```

3. Verify `EXPO_PUBLIC_SENTRY_ENABLED=true`

### **Issue: Errors not appearing in Sentry**

**Symptoms:**
- Errors occur but don't show in Sentry dashboard

**Solutions:**
1. Check environment setting:
   - In development, errors are logged but NOT sent to Sentry by default
   - Set `EXPO_PUBLIC_SENTRY_ENVIRONMENT=production` to test

2. Check Sentry status:
   - Go to https://status.sentry.io/

3. Verify DSN is correct:
   - Settings → Projects → nhs-app → Client Keys (DSN)

### **Issue: Too many errors in development**

**Symptoms:**
- Sentry quota exceeded from dev testing

**Solutions:**
1. Disable Sentry in development:
   ```bash
   EXPO_PUBLIC_SENTRY_ENABLED=false
   ```

2. Use environment-specific configs:
   - `.env` (dev) - Sentry disabled
   - `.env.production` - Sentry enabled

### **Issue: Sensitive data in error reports**

**Symptoms:**
- API keys or tokens visible in Sentry

**Solutions:**
- Already handled! The `beforeSend` hook filters:
  - Authorization headers
  - Cookies
  - Any field with "key", "token", or "password"

---

## 📚 Additional Resources

### **Sentry Documentation**
- React Native Guide: https://docs.sentry.io/platforms/react-native/
- Error Monitoring: https://docs.sentry.io/product/issues/
- Performance Monitoring: https://docs.sentry.io/product/performance/

### **Best Practices**
1. **Don't send PII** - Personal Identifiable Information
2. **Use breadcrumbs** - Track user actions leading to errors
3. **Tag releases** - Always deploy with version tags
4. **Set up alerts** - Get notified of critical issues
5. **Review weekly** - Check Sentry dashboard weekly

### **Support**
- Sentry Support: https://sentry.io/support/
- NHS App Issues: Contact your development team

---

## ✅ Checklist

Before going to production, verify:

- [ ] Sentry account created
- [ ] Project created in Sentry
- [ ] DSN added to `.env`
- [ ] Sentry initializes successfully (check console)
- [ ] Test error appears in Sentry dashboard
- [ ] User context is tracked (user ID, email)
- [ ] Organization context is tracked
- [ ] Alerts configured
- [ ] Production environment configured
- [ ] `.env.production` has correct settings
- [ ] EAS build includes Sentry DSN

---

## 🎉 You're All Set!

Sentry is now monitoring your NHS App for errors. You'll be notified immediately when issues occur, with full context to debug and fix them quickly.

**Next Steps:**
1. Test the integration with a few errors
2. Set up your alert preferences
3. Deploy to production
4. Monitor your dashboard weekly

**Questions?** Check the troubleshooting section or Sentry's documentation.
