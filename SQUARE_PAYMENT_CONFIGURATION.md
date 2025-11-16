
# Square Payment Configuration Guide

## Overview
The Square payment integration requires configuration on the **backend** (PhotoForge webapp). The mobile app does not store these credentials directly for security reasons.

## Required Square Credentials

You need to configure the following Square payment credentials on your backend:

### 1. Square Access Token
- **Description**: Your Square API access token for processing payments
- **Location**: Backend environment variables or secure configuration
- **Format**: `Bearer <token>`
- **Example**: `Bearer EAAAEOuLQhKxPxKzN...`

### 2. Square Application ID
- **Description**: Your Square application identifier
- **Location**: Backend environment variables or secure configuration
- **Format**: String
- **Example**: `sandbox-sq0idb-...` (sandbox) or `sq0idp-...` (production)

### 3. Square Location ID
- **Description**: The Square location where payments will be processed
- **Location**: Backend environment variables or secure configuration
- **Format**: String
- **Example**: `LXXX...` or `LH2X...`

### 4. Square Environment
- **Description**: Determines whether to use sandbox or production Square API
- **Location**: Backend environment variables or secure configuration
- **Options**: `sandbox` or `production`
- **Default**: `sandbox` (for testing)

### 5. Square Webhook Signature Key
- **Description**: Used to verify webhook authenticity from Square
- **Location**: Backend environment variables or secure configuration
- **Format**: String
- **Purpose**: Validates that webhook requests are genuinely from Square

## Backend Configuration Steps

### Step 1: Access Your Backend Configuration
Navigate to your PhotoForge backend at: `https://photoforge.base44.app`

### Step 2: Set Environment Variables
Add the following environment variables to your backend configuration:

```bash
SQUARE_ACCESS_TOKEN=<your_square_access_token>
SQUARE_APPLICATION_ID=<your_square_application_id>
SQUARE_LOCATION_ID=<your_square_location_id>
SQUARE_ENVIRONMENT=sandbox  # or 'production' for live payments
SQUARE_WEBHOOK_SIGNATURE_KEY=<your_webhook_signature_key>
```

### Step 3: Update Backend Functions
Ensure your backend has the following functions configured:

#### `squarePayment` Function
- **Endpoint**: `POST /api/functions/squarePayment`
- **Purpose**: Process payments (donations and subscriptions)
- **Parameters**:
  - `access_key`: User authentication
  - `payment_type`: "donation" or "subscription"
  - `amount`: Payment amount in dollars
  - `nonce`: Square payment nonce from mobile app
  - `idempotency_key`: Unique transaction identifier
  - `customer_email`: (optional) Customer email
  - `customer_name`: (optional) Customer name

#### `testSquareCredentials` Function (Optional)
- **Endpoint**: `POST /api/functions/testSquareCredentials`
- **Purpose**: Verify Square credentials are configured correctly
- **Access**: Admin only

## Getting Square Credentials

### For Sandbox (Testing)
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create a new application or select existing one
3. Navigate to "Credentials" tab
4. Copy **Sandbox Access Token**
5. Copy **Sandbox Application ID**
6. Navigate to "Locations" to get **Location ID**

### For Production (Live Payments)
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Navigate to "Credentials" tab
4. Copy **Production Access Token** (requires Square account verification)
5. Copy **Production Application ID**
6. Navigate to "Locations" to get **Location ID**

### Webhook Signature Key
1. In Square Developer Dashboard, go to "Webhooks"
2. Create a new webhook endpoint
3. Set the URL to your backend webhook handler
4. Copy the **Signature Key** provided by Square

## Mobile App Integration

The mobile app is already configured to use these backend credentials through the `squarePayment` function in `utils/apiClient.ts`.

### How It Works:
1. User enters payment details in the mobile app
2. Mobile app generates a payment nonce (tokenized card data)
3. Mobile app calls `squarePayment` function with the nonce
4. Backend uses stored Square credentials to process the payment
5. Backend returns success/failure to mobile app

### Payment Types:
- **Donations**: User-specified amount
- **Subscriptions**: Fixed $5/month recurring payment

## Security Best Practices

1. **Never store Square credentials in the mobile app**
2. **Use environment variables** on the backend
3. **Rotate access tokens** periodically
4. **Use sandbox environment** for testing
5. **Validate webhook signatures** to prevent fraud
6. **Log all payment transactions** for audit trail
7. **Implement rate limiting** on payment endpoints

## Testing Payments

### Test Card Numbers (Sandbox Only)
- **Success**: `4111 1111 1111 1111`
- **Decline**: `4000 0000 0000 0002`
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **ZIP**: Any 5 digits

### Testing Workflow
1. Set `SQUARE_ENVIRONMENT=sandbox` on backend
2. Use test card numbers in mobile app
3. Verify payment appears in Square Dashboard (Sandbox)
4. Check backend logs for transaction details

## Troubleshooting

### Common Issues:

**"Payment failed" error**
- Verify Square credentials are correct
- Check that environment is set correctly (sandbox vs production)
- Ensure access token has not expired

**"Invalid nonce" error**
- Nonce can only be used once
- Generate a new nonce for each payment attempt

**"Location not found" error**
- Verify Location ID matches your Square account
- Ensure location is active in Square Dashboard

**Webhook not receiving events**
- Verify webhook URL is publicly accessible
- Check webhook signature key matches
- Ensure webhook is enabled in Square Dashboard

## Support

For Square-specific issues:
- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Square Developer Forums](https://developer.squareup.com/forums)
- [Square Support](https://squareup.com/help)

For PhotoForge backend issues:
- Use the in-app Support feature
- Contact your backend administrator
