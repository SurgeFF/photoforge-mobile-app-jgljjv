
# Deployment Checklist for Firebase Crashlytics

## Pre-Deployment Setup

### Firebase Configuration
- [ ] Firebase project created at https://console.firebase.google.com/
- [ ] iOS app added with bundle ID: `com.anonymous.Natively`
- [ ] Android app added with package name: `com.anonymous.Natively`
- [ ] `GoogleService-Info.plist` downloaded and placed in project root
- [ ] `google-services.json` downloaded and placed in project root

### Code Verification
- [ ] `@react-native-firebase/crashlytics` package installed
- [ ] `app.json` configured with Firebase plugins
- [ ] `utils/crashlytics.ts` created and reviewed
- [ ] `utils/analytics.ts` updated with Crashlytics integration
- [ ] `utils/apiClient.ts` updated with new storage bucket URL

### Documentation Review
- [ ] Read `FIREBASE_CRASHLYTICS_SETUP.md`
- [ ] Read `WEBAPP_INTEGRATION_NOTES.md`
- [ ] Review `QUICK_REFERENCE.md`
- [ ] Share `WEBAPP_INTEGRATION_NOTES.md` with backend team

## Development Build

### Build Setup
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Logged into Expo: `eas login`
- [ ] EAS Build configured: `eas build:configure`

### iOS Development Build
- [ ] Run: `eas build --platform ios --profile development`
- [ ] Build completed successfully
- [ ] Development build installed on test device
- [ ] App launches without errors

### Android Development Build
- [ ] Run: `eas build --platform android --profile development`
- [ ] Build completed successfully
- [ ] Development build installed on test device
- [ ] App launches without errors

## Testing Phase

### Crashlytics Testing
- [ ] Trigger a test crash in development
- [ ] Wait 5 minutes for crash to upload
- [ ] Verify crash appears in Firebase Console → Crashlytics
- [ ] Check crash details include stack trace
- [ ] Verify user context is captured

### Analytics Testing
- [ ] Open Firebase Console → Analytics → DebugView
- [ ] Navigate through app screens
- [ ] Verify screen views appear in DebugView
- [ ] Trigger custom events (login, logout, etc.)
- [ ] Verify events appear in DebugView

### Error Logging Testing
- [ ] Test custom error logging with `logError()`
- [ ] Test custom message logging with `logMessage()`
- [ ] Test user ID setting with `setUserId()`
- [ ] Test custom attributes with `setAttribute()`
- [ ] Verify all logs appear in Crashlytics

### Storage Testing
- [ ] Test file upload to Firebase Storage
- [ ] Verify files are stored in correct bucket
- [ ] Test file download from storage
- [ ] Verify storage URLs are accessible

### API Integration Testing
- [ ] Test all mobile API endpoints
- [ ] Verify access key authentication works
- [ ] Test project creation and retrieval
- [ ] Test media upload and retrieval
- [ ] Test flight plan generation
- [ ] Test drone control commands
- [ ] Test payment processing
- [ ] Test support ticket submission

## Webapp Integration

### Backend Verification
- [ ] Webapp team has received `WEBAPP_INTEGRATION_NOTES.md`
- [ ] Firebase storage bucket updated to: `gs://gen-lang-client-0688382477.firebasestorage.app`
- [ ] iOS and Android apps registered in Firebase project
- [ ] All mobile API endpoints tested and working
- [ ] Storage URLs returned from API are accessible
- [ ] Payment integration tested end-to-end

### Security Verification
- [ ] Firebase Security Rules configured for mobile app
- [ ] Mobile access keys have appropriate permissions
- [ ] File uploads are properly authenticated
- [ ] Storage URLs use signed URLs if needed

## Production Build

### Pre-Production Checks
- [ ] All development tests passed
- [ ] No critical bugs in Crashlytics
- [ ] Analytics data looks correct
- [ ] Storage integration working properly
- [ ] API endpoints stable and performant

### iOS Production Build
- [ ] Run: `eas build --platform ios --profile production`
- [ ] Build completed successfully
- [ ] Test production build on device
- [ ] Verify Crashlytics works in production
- [ ] Verify analytics works in production
- [ ] Submit to App Store (if ready)

### Android Production Build
- [ ] Run: `eas build --platform android --profile production`
- [ ] Build completed successfully
- [ ] Test production build on device
- [ ] Verify Crashlytics works in production
- [ ] Verify analytics works in production
- [ ] Submit to Google Play (if ready)

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor Firebase Console → Crashlytics for crashes
- [ ] Check crash-free users percentage
- [ ] Monitor Firebase Console → Analytics for user sessions
- [ ] Verify user engagement metrics
- [ ] Check API endpoint performance
- [ ] Monitor storage usage

### First Week
- [ ] Review crash trends in Crashlytics
- [ ] Analyze user behavior in Analytics
- [ ] Check for any error patterns
- [ ] Monitor storage costs
- [ ] Review API usage patterns
- [ ] Gather user feedback

### Ongoing Monitoring
- [ ] Set up Crashlytics alerts for critical crashes
- [ ] Set up Analytics alerts for unusual patterns
- [ ] Regular review of crash reports
- [ ] Regular review of analytics data
- [ ] Monitor Firebase costs
- [ ] Update documentation as needed

## Rollback Plan

### If Critical Issues Found
- [ ] Document the issue in Crashlytics
- [ ] Notify users via in-app message
- [ ] Roll back to previous version if necessary
- [ ] Fix issue in development
- [ ] Test fix thoroughly
- [ ] Deploy fixed version

### Emergency Contacts
- Firebase Support: https://firebase.google.com/support
- Expo Support: https://expo.dev/support
- Internal team contacts: [Add your team contacts]

## Success Criteria

### Crashlytics
- ✅ Crash-free users > 99%
- ✅ All crashes have stack traces
- ✅ User context captured correctly
- ✅ Alerts configured and working

### Analytics
- ✅ User sessions tracked correctly
- ✅ Screen views captured
- ✅ Custom events working
- ✅ User properties set correctly

### Storage
- ✅ Files upload successfully
- ✅ Files stored in correct bucket
- ✅ Files accessible from mobile app
- ✅ Storage costs within budget

### API Integration
- ✅ All endpoints responding correctly
- ✅ Authentication working properly
- ✅ Response times acceptable
- ✅ Error handling working correctly

## Notes

- Keep this checklist updated as you progress
- Mark items as complete with the date
- Document any issues encountered
- Share progress with the team

## Completion

- [ ] All checklist items completed
- [ ] Documentation updated
- [ ] Team notified of deployment
- [ ] Monitoring dashboards set up
- [ ] Success criteria met

**Deployment Date**: _______________

**Deployed By**: _______________

**Notes**: _______________
