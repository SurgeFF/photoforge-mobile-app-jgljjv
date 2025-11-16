
# Webapp Integration Notes for Mobile App

## Firebase Configuration Updates

The mobile app has been updated with the following Firebase configuration:

### Firebase Storage Bucket
```
gs://gen-lang-client-0688382477.firebasestorage.app
```

**Action Required**: Ensure all file uploads and storage operations use this bucket URL.

## Mobile App Identifiers

The webapp backend should have these identifiers registered in the Firebase project:

- **iOS Bundle ID**: `com.anonymous.Natively`
- **Android Package Name**: `com.anonymous.Natively`

## Firebase Services Enabled

1. **Firebase Analytics** - Already integrated and working
2. **Firebase Crashlytics** - Now integrated for crash reporting
3. **Firebase Storage** - Using the bucket specified above

## API Endpoints Currently Used

The mobile app communicates with the following endpoints:

### Authentication
- `POST /api/functions/validate-key` - Validate access key
- `POST /api/functions/validateMobileAccessKey` - Alternative validation
- `POST /api/functions/generateMobileAccessKey` - Generate new key

### Projects
- `POST /api/functions/getProjectsMobile` - Get all projects
- `POST /api/functions/getProjectDetailMobile` - Get project details
- `POST /api/functions/createProjectMobile` - Create new project

### Media
- `POST /api/functions/uploadMediaMobile` - Upload single file
- `POST /api/functions/uploadMediaBatchMobile` - Upload multiple files
- `POST /api/functions/getMediaFilesMobile` - Get project media
- `POST /api/functions/getProcessedModelsMobile` - Get 3D models

### Flight Planning
- `POST /api/functions/generateFlightPlanMobile` - Generate flight plan

### Processing
- `POST /api/functions/startProcessingMobile` - Start 3D processing
- `POST /api/functions/checkProcessingStatusMobile` - Check processing status

### Payments
- `POST /api/functions/squarePaymentMobile` - Process payment
- `POST /api/functions/checkPaymentNotifications` - Check payment status
- `POST /api/functions/checkSubscription` - Check subscription status

### Drone Control
- `POST /api/functions/djiConnect` - Connect to drone
- `POST /api/functions/djiUploadFlightPlan` - Upload flight plan
- `POST /api/functions/djiStartMission` - Start mission
- `POST /api/functions/djiManualControl` - Manual control
- `POST /api/functions/djiReturnHome` - Return to home
- `POST /api/functions/djiPauseMission` - Pause mission
- `POST /api/functions/djiResumeMission` - Resume mission
- `POST /api/functions/djiStopMission` - Stop mission
- `POST /api/functions/djiDisconnect` - Disconnect drone

### Support
- `POST /api/functions/submitSupportTicket` - Submit support ticket

## Request Format

All mobile endpoints expect:
```json
{
  "access_key": "user_mobile_access_key",
  // ... other parameters
}
```

## Storage URL Format

When returning file URLs to the mobile app, ensure they reference the correct Firebase Storage bucket:

```
https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0688382477.firebasestorage.app/o/...
```

Or use the gs:// format:
```
gs://gen-lang-client-0688382477.firebasestorage.app/path/to/file
```

## Analytics Events

The mobile app tracks the following events that may be useful for the webapp:

- `screen_view` - Screen navigation
- `login` / `logout` - User authentication
- `project_created` - New project creation
- `flight_plan_generated` - Flight plan generation
- `drone_connection` - Drone connection attempts
- `mission_started` - Mission start
- `processing_started` - 3D processing start
- `payment` - Payment transactions
- `support_ticket_submitted` - Support ticket submission

## Crashlytics Integration

The mobile app now reports crashes and errors to Firebase Crashlytics. This includes:

- JavaScript errors
- Native crashes (iOS/Android)
- Custom error logs
- User context (user ID, custom attributes)

## Testing Checklist

To verify the integration:

1. ✅ Firebase Storage bucket is accessible from mobile app
2. ✅ File uploads go to the correct bucket
3. ✅ File URLs returned from API are accessible
4. ✅ Mobile access keys work with all endpoints
5. ✅ Analytics events appear in Firebase Console
6. ✅ Crash reports appear in Crashlytics (after test crash)

## Security Considerations

1. Ensure Firebase Security Rules allow mobile app access
2. Verify that mobile access keys have appropriate permissions
3. Check that file uploads are properly authenticated
4. Confirm that storage URLs use signed URLs if needed

## Next Steps for Webapp Team

1. **Verify Firebase Project Setup**
   - Confirm iOS and Android apps are registered
   - Check that bundle IDs match: `com.anonymous.Natively`

2. **Update Storage Configuration**
   - Point all storage operations to: `gs://gen-lang-client-0688382477.firebasestorage.app`
   - Update any hardcoded storage URLs

3. **Test API Endpoints**
   - Verify all mobile endpoints are working
   - Test with a mobile access key
   - Confirm file uploads work correctly

4. **Monitor Analytics**
   - Check Firebase Console for mobile app events
   - Verify user sessions are being tracked
   - Monitor crash reports in Crashlytics

## Contact

For questions about the mobile app integration, please refer to:
- `FIREBASE_CRASHLYTICS_SETUP.md` - Detailed Firebase setup
- `firebase-config.md` - Firebase configuration reference
- `utils/apiClient.ts` - API client implementation
- `utils/analytics.ts` - Analytics implementation
- `utils/crashlytics.ts` - Crashlytics implementation
