
# PhotoForge Mobile - Webapp Backend Integration Guide

This document provides all the code and specifications needed to integrate the mobile app's 3D processing features with the PhotoForge webapp backend.

## Overview

The mobile app now supports two processing methods:
- **Local Processing (Legacy)**: Uses Autodesk RealityScan (will be removed January 1, 2026)
- **Cloud Processing (Recommended)**: Processes models in the cloud with downloadable files

## API Endpoints Required

### 1. Start Processing (Mobile)

**Endpoint**: `POST /api/functions/startProcessingMobile`

**Request Body**:
```json
{
  "access_key": "string",
  "project_id": "string",
  "processing_settings": {
    "processing_method": "local" | "cloud",
    "quality": "low" | "medium" | "high" | "ultra",
    "output_types": ["mesh", "orthomosaic", "point_cloud", "dem"],
    "formats": {
      "mesh": "obj" | "fbx" | "ply" | "stl",
      "point_cloud": "las" | "laz" | "ply",
      "orthomosaic": "geotiff" | "jpg" | "png"
    },
    "coordinate_system": "string",
    "use_gcp": boolean,
    "gcp_file": "string (optional)"
  }
}
```

**Response**:
```json
{
  "success": true,
  "model_id": "string",
  "job_id": "string",
  "message": "Processing started successfully"
}
```

**Implementation Notes**:
- Validate the `access_key` and ensure user has access to the project
- Create a new processing job in the database
- Queue the processing task based on `processing_method`
- For cloud processing, set up file storage locations for outputs
- Return unique identifiers for tracking

### 2. Check Processing Status (Mobile)

**Endpoint**: `POST /api/functions/checkProcessingStatusMobile`

**Request Body**:
```json
{
  "access_key": "string",
  "model_id": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "model_id": "string",
    "model_name": "string",
    "model_type": "string",
    "project_id": "string",
    "status": "queued" | "processing" | "completed" | "failed",
    "progress": 0-100,
    "status_message": "string",
    "uploaded_files": number,
    "total_files": number,
    "processing_time": number,
    "resolution": "string",
    "file_size": number,
    "output_url": "string (optional)",
    "thumbnail_url": "string (optional)",
    "settings": object,
    "metadata": object,
    "created_date": "ISO 8601 string",
    "updated_date": "ISO 8601 string",
    "poll_interval": 5000
  }
}
```

**Implementation Notes**:
- Poll this endpoint every 5 seconds from the mobile app
- Return current processing status and progress
- Include error messages if status is "failed"

### 3. Get Processed Models (Mobile)

**Endpoint**: `POST /api/functions/getProcessedModelsMobile`

**Request Body**:
```json
{
  "access_key": "string",
  "project_id": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "model_name": "string",
      "model_type": "string",
      "status": "completed",
      "processing_method": "local" | "cloud",
      "output_url": "string",
      "thumbnail_url": "string",
      "file_size": number,
      "resolution": "string",
      "created_date": "ISO 8601 string",
      "download_urls": {
        "mesh": "string (optional)",
        "textures": "string (optional)",
        "point_cloud": "string (optional)",
        "orthomosaic": "string (optional)",
        "dem": "string (optional)"
      },
      "coordinate_system": "string",
      "poly_count": number
    }
  ]
}
```

**Implementation Notes**:
- Return all processed models for the project
- Include download URLs for cloud-processed models
- Each download URL should be a direct link to the file
- URLs can be signed/temporary URLs with expiration

## Database Schema Updates

### ProcessedModel Table

Add the following fields to your existing processed models table:

```sql
ALTER TABLE processed_models ADD COLUMN processing_method VARCHAR(10) DEFAULT 'local';
ALTER TABLE processed_models ADD COLUMN download_urls JSONB;
ALTER TABLE processed_models ADD COLUMN coordinate_system VARCHAR(50);
ALTER TABLE processed_models ADD COLUMN poly_count INTEGER;
```

### Processing Jobs Table

Create or update a processing jobs table:

```sql
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(255) UNIQUE NOT NULL,
  model_id UUID REFERENCES processed_models(id),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  processing_method VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL,
  progress INTEGER DEFAULT 0,
  status_message TEXT,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

## Cloud Processing Implementation

### File Storage Structure

For cloud-processed models, organize files as follows:

```
/storage/
  /projects/
    /{project_id}/
      /models/
        /{model_id}/
          /mesh/
            - model.obj
            - model.mtl
            - textures/
          /point_cloud/
            - pointcloud.las
          /orthomosaic/
            - orthomosaic.tif
          /dem/
            - elevation.tif
```

### Download URL Generation

Generate signed URLs for downloads:

```javascript
// Example using AWS S3
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

function generateDownloadUrl(bucket, key, expiresIn = 3600) {
  return s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key,
    Expires: expiresIn // 1 hour
  });
}

// Usage
const downloadUrls = {
  mesh: generateDownloadUrl('photoforge-storage', `projects/${projectId}/models/${modelId}/mesh/model.obj`),
  textures: generateDownloadUrl('photoforge-storage', `projects/${projectId}/models/${modelId}/mesh/textures.zip`),
  point_cloud: generateDownloadUrl('photoforge-storage', `projects/${projectId}/models/${modelId}/point_cloud/pointcloud.las`),
  orthomosaic: generateDownloadUrl('photoforge-storage', `projects/${projectId}/models/${modelId}/orthomosaic/orthomosaic.tif`),
  dem: generateDownloadUrl('photoforge-storage', `projects/${projectId}/models/${modelId}/dem/elevation.tif`)
};
```

## Processing Pipeline

### Cloud Processing Workflow

1. **Job Creation**:
   - Receive processing request from mobile app
   - Create job record in database
   - Queue job for processing

2. **Processing**:
   - Fetch images from project
   - Run photogrammetry pipeline (e.g., OpenDroneMap, Meshroom, or Autodesk API)
   - Generate requested output types
   - Store files in cloud storage

3. **Status Updates**:
   - Update job status and progress in database
   - Mobile app polls for updates every 5 seconds

4. **Completion**:
   - Generate download URLs for all output files
   - Update model record with download URLs
   - Set status to "completed"
   - Mobile app receives completion notification

### Example Processing Function

```javascript
async function processModel(jobId, projectId, settings) {
  try {
    // Update status to processing
    await updateJobStatus(jobId, 'processing', 0);
    
    // Fetch images
    const images = await getProjectImages(projectId);
    await updateJobStatus(jobId, 'processing', 10, 'Fetching images');
    
    // Run photogrammetry
    const result = await runPhotogrammetry(images, settings);
    await updateJobStatus(jobId, 'processing', 50, 'Generating 3D model');
    
    // Generate outputs
    const outputs = await generateOutputs(result, settings);
    await updateJobStatus(jobId, 'processing', 80, 'Generating output files');
    
    // Upload to storage
    const downloadUrls = await uploadOutputs(projectId, jobId, outputs);
    await updateJobStatus(jobId, 'processing', 95, 'Uploading files');
    
    // Complete
    await completeJob(jobId, downloadUrls);
    await updateJobStatus(jobId, 'completed', 100, 'Processing complete');
    
  } catch (error) {
    await updateJobStatus(jobId, 'failed', 0, error.message);
  }
}
```

## Security Considerations

1. **Access Control**:
   - Validate access_key for all requests
   - Ensure users can only access their own projects
   - Verify project ownership before processing

2. **Download URLs**:
   - Use signed URLs with expiration (1-24 hours)
   - Regenerate URLs on each request
   - Log download activity

3. **Rate Limiting**:
   - Limit processing requests per user
   - Implement queue system for fair processing
   - Set maximum file sizes and counts

## Testing

### Test Processing Request

```bash
curl -X POST https://photoforge.base44.app/api/functions/startProcessingMobile \
  -H "Content-Type: application/json" \
  -d '{
    "access_key": "your_access_key",
    "project_id": "project_uuid",
    "processing_settings": {
      "processing_method": "cloud",
      "quality": "high",
      "output_types": ["mesh", "point_cloud"],
      "formats": {
        "mesh": "obj",
        "point_cloud": "las"
      },
      "coordinate_system": "WGS84",
      "use_gcp": false
    }
  }'
```

### Test Status Check

```bash
curl -X POST https://photoforge.base44.app/api/functions/checkProcessingStatusMobile \
  -H "Content-Type: application/json" \
  -d '{
    "access_key": "your_access_key",
    "model_id": "model_uuid"
  }'
```

### Test Get Models

```bash
curl -X POST https://photoforge.base44.app/api/functions/getProcessedModelsMobile \
  -H "Content-Type: application/json" \
  -d '{
    "access_key": "your_access_key",
    "project_id": "project_uuid"
  }'
```

## Migration Plan

### Phase 1: Add Cloud Processing (Now)
- Implement new endpoints
- Add database fields
- Set up cloud storage
- Test with beta users

### Phase 2: Deprecation Notice (Now - Dec 31, 2025)
- Display legacy notice in app
- Encourage users to switch to cloud processing
- Monitor usage metrics

### Phase 3: Remove Legacy (Jan 1, 2026)
- Remove Autodesk RealityScan integration
- Remove local processing option
- Update documentation

## Support

For questions or issues with the integration, contact:
- Email: support@photoforge.base44.app
- Documentation: https://photoforge.base44.app/docs

---

© DronE1337 - All rights reserved
© PhotoForge - All rights reserved
