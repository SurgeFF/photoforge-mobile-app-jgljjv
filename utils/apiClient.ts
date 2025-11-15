
/**
 * PhotoForge API Client
 * 
 * This utility provides functions to interact with the PhotoForge backend API.
 * 
 * Base URL: https://photoforge.base44.app
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const WEBAPP_URL = "https://photoforge.base44.app";
const FUNCTIONS_BASE = `${WEBAPP_URL}/api/functions`;
const ENTITIES_BASE = `${WEBAPP_URL}/api/entities`;
const INTEGRATIONS_BASE = `${WEBAPP_URL}/api/integrations`;
const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface Subscription {
  status: string;
  plan_type: string;
  trial_end_date?: string;
  subscription_end_date?: string;
}

export interface DroneInfo {
  model: string;
  firmware: string;
  battery: number;
  gps_signal: number;
}

export interface Project {
  id: string;
  name: string;
  location?: string;
  status: string;
  created_date: string;
  updated_at?: string;
  [key: string]: any;
}

export interface MediaFile {
  id: string;
  project_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  metadata?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    [key: string]: any;
  };
  created_at?: string;
  [key: string]: any;
}

export interface ProcessedModel {
  id: string;
  project_id: string;
  model_type: string;
  status: string;
  output_url?: string;
  thumbnail_url?: string;
  file_size?: number;
  created_at?: string;
  [key: string]: any;
}

export interface ProjectDetail {
  project: Project;
  media_files: MediaFile[];
  models: ProcessedModel[];
}

export async function getAccessKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
  } catch (error) {
    console.error("❌ Error getting access key:", error);
    return null;
  }
}

// ==================== AUTHENTICATION ====================

/**
 * Validate access key with the backend
 */
export async function validateAccessKey(accessKey: string): Promise<ApiResponse<User>> {
  try {
    console.log("\n========== VALIDATING ACCESS KEY ==========");
    console.log("🔑 Starting validation...");
    console.log("📍 Endpoint:", `${FUNCTIONS_BASE}/validate-key`);
    console.log("🔐 Access key (first 10 chars):", accessKey.substring(0, 10) + "...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/validate-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessKey }),
    });

    console.log("📊 Status:", response.status, response.statusText);
    
    const responseText = await response.text();
    console.log("📄 Response body (raw):", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return {
        success: false,
        error: "Invalid server response format",
      };
    }

    if (response.ok && data.success) {
      console.log("✅ Access key is VALID");
      console.log("========== VALIDATION SUCCESS ==========\n");
      return {
        success: true,
        data: data.user,
      };
    } else {
      const errorMsg = data.error || "Invalid access key";
      console.log("❌ Access key is INVALID");
      console.log("========== VALIDATION FAILED ==========\n");
      return {
        success: false,
        error: errorMsg,
      };
    }
  } catch (error) {
    console.error("❌ EXCEPTION during validation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Validate mobile access key (alternative endpoint)
 */
export async function validateMobileAccessKey(accessKey: string): Promise<ApiResponse<any>> {
  try {
    console.log("🔑 Validating mobile access key...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/validateMobileAccessKey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_key: accessKey }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Mobile access key validated");
      return { success: true, data };
    } else {
      return { success: false, error: data.message || "Invalid access key" };
    }
  } catch (error) {
    console.error("❌ Validate mobile access key error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Generate a new mobile access key (requires web authentication)
 */
export async function generateMobileAccessKey(): Promise<ApiResponse<any>> {
  try {
    console.log("🔑 Generating mobile access key...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/generateMobileAccessKey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Mobile access key generated");
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Failed to generate access key" };
    }
  } catch (error) {
    console.error("❌ Generate access key error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ==================== PROJECT MANAGEMENT ====================

/**
 * Get all projects for authenticated mobile user
 * Uses the new mobile-specific endpoint that returns all project data
 */
export async function getProjectsMobile(accessKey: string): Promise<ApiResponse<Project[]>> {
  try {
    console.log("\n========== FETCHING PROJECTS (MOBILE) ==========");
    console.log("📂 Fetching all projects for mobile user...");
    console.log("📍 Endpoint:", `${FUNCTIONS_BASE}/getProjectsMobile`);
    console.log("🔐 Access key (first 10 chars):", accessKey.substring(0, 10) + "...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/getProjectsMobile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_key: accessKey }),
    });

    console.log("📊 Status:", response.status, response.statusText);
    
    const data = await response.json();
    console.log("📄 Response data:", JSON.stringify(data).substring(0, 200) + "...");
    
    if (response.ok && data.success) {
      const projects = data.data || [];
      console.log("✅ Projects loaded successfully:", projects.length, "projects");
      console.log("========== FETCH PROJECTS SUCCESS ==========\n");
      return { success: true, data: projects };
    } else {
      const errorMsg = data.error || "Failed to load projects";
      console.log("❌ Failed to load projects:", errorMsg);
      console.log("========== FETCH PROJECTS FAILED ==========\n");
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error("❌ EXCEPTION during getProjectsMobile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get single project with media files and processed models
 * Uses the new mobile-specific endpoint that returns complete project details
 */
export async function getProjectDetailMobile(accessKey: string, projectId: string): Promise<ApiResponse<ProjectDetail>> {
  try {
    console.log("\n========== FETCHING PROJECT DETAIL (MOBILE) ==========");
    console.log("📂 Fetching project detail for mobile user...");
    console.log("📍 Endpoint:", `${FUNCTIONS_BASE}/getProjectDetailMobile`);
    console.log("🔐 Access key (first 10 chars):", accessKey.substring(0, 10) + "...");
    console.log("🆔 Project ID:", projectId);
    
    const response = await fetch(`${FUNCTIONS_BASE}/getProjectDetailMobile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        access_key: accessKey,
        project_id: projectId 
      }),
    });

    console.log("📊 Status:", response.status, response.statusText);
    
    const data = await response.json();
    console.log("📄 Response data:", JSON.stringify(data).substring(0, 200) + "...");
    
    if (response.ok && data.success) {
      const projectDetail = data.data;
      console.log("✅ Project detail loaded successfully");
      console.log("   - Project:", projectDetail.project?.name || "Unknown");
      console.log("   - Media files:", projectDetail.media_files?.length || 0);
      console.log("   - Models:", projectDetail.models?.length || 0);
      console.log("========== FETCH PROJECT DETAIL SUCCESS ==========\n");
      return { success: true, data: projectDetail };
    } else {
      const errorMsg = data.error || "Failed to load project detail";
      console.log("❌ Failed to load project detail:", errorMsg);
      console.log("========== FETCH PROJECT DETAIL FAILED ==========\n");
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error("❌ EXCEPTION during getProjectDetailMobile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get projects with authenticated access key (legacy method)
 */
export async function getProjects(accessKey: string): Promise<ApiResponse<any[]>> {
  try {
    console.log("📂 Fetching projects (legacy)...");
    
    const response = await fetch(`${ENTITIES_BASE}/Project`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessKey}`,
      },
    });

    if (response.ok) {
      const projects = await response.json();
      console.log("✅ Projects loaded:", projects.length);
      return { success: true, data: projects };
    } else {
      const errorText = await response.text();
      console.error("❌ Failed to load projects:", errorText);
      return { success: false, error: "Failed to load projects" };
    }
  } catch (error) {
    console.error("❌ Projects error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get a specific project by ID (legacy method)
 */
export async function getProjectById(accessKey: string, projectId: string): Promise<ApiResponse<any>> {
  try {
    console.log("📂 Fetching project by ID:", projectId);
    
    const response = await fetch(`${ENTITIES_BASE}/Project/${projectId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessKey}`,
      },
    });

    if (response.ok) {
      const project = await response.json();
      console.log("✅ Project loaded");
      return { success: true, data: project };
    } else {
      return { success: false, error: "Failed to load project" };
    }
  } catch (error) {
    console.error("❌ Get project error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Create a new project
 */
export async function createProject(accessKey: string, project: any): Promise<ApiResponse<any>> {
  try {
    console.log("➕ Creating project...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/createProjectMobile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_key: accessKey,
        project: project,
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Project created successfully");
      return { success: true, data: data.data };
    } else {
      const errorMsg = data.error || "Failed to create project";
      console.error("❌ Failed to create project:", errorMsg);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error("❌ Create project error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get media files for a project (legacy method)
 */
export async function getMediaFiles(accessKey: string, projectId: string): Promise<ApiResponse<any[]>> {
  try {
    console.log("📷 Fetching media files for project:", projectId);
    
    const response = await fetch(`${ENTITIES_BASE}/MediaFile?project_id=${projectId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessKey}`,
      },
    });

    if (response.ok) {
      const mediaFiles = await response.json();
      console.log("✅ Media files loaded:", mediaFiles.length);
      return { success: true, data: mediaFiles };
    } else {
      return { success: false, error: "Failed to load media files" };
    }
  } catch (error) {
    console.error("❌ Get media files error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get processed models for a project (legacy method)
 */
export async function getProcessedModels(accessKey: string, projectId: string): Promise<ApiResponse<any[]>> {
  try {
    console.log("🎨 Fetching processed models for project:", projectId);
    
    const response = await fetch(`${ENTITIES_BASE}/ProcessedModel?project_id=${projectId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessKey}`,
      },
    });

    if (response.ok) {
      const models = await response.json();
      console.log("✅ Processed models loaded:", models.length);
      return { success: true, data: models };
    } else {
      return { success: false, error: "Failed to load processed models" };
    }
  } catch (error) {
    console.error("❌ Get processed models error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ==================== MAPPING & TERRAIN ====================

/**
 * Generate topographic map background
 */
export async function generateTopoMap(center?: [number, number], zoom: number = 3): Promise<ApiResponse<string>> {
  try {
    console.log("🗺️ Generating topographic map...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/generateTopoMap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        center: center || [0, 0],
        zoom: zoom,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Topographic map generated");
      return { success: true, data: data.image_url || data.imageUrl || data.url };
    } else {
      return { success: false, error: "Failed to generate map" };
    }
  } catch (error) {
    console.error("❌ Topo map error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Generate drone flight plan waypoints
 */
export async function generateFlightPlan(params: {
  area: any;
  altitude: number;
  overlap: number;
  drone_specs?: any;
}): Promise<ApiResponse<any>> {
  try {
    console.log("✈️ Generating flight plan...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/generateFlightPlan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Flight plan generated");
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Failed to generate flight plan" };
    }
  } catch (error) {
    console.error("❌ Generate flight plan error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get elevation data for coordinates
 */
export async function getElevationData(coordinates: [number, number][]): Promise<ApiResponse<number[]>> {
  try {
    console.log("⛰️ Getting elevation data...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/getElevationData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Elevation data retrieved");
      return { success: true, data: data.elevations };
    } else {
      return { success: false, error: data.error || "Failed to get elevation data" };
    }
  } catch (error) {
    console.error("❌ Get elevation data error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ==================== DJI DRONE CONTROL ====================

/**
 * Connect to DJI drone
 */
export async function djiConnect(connectionType: string): Promise<ApiResponse<DroneInfo>> {
  try {
    console.log("🚁 Connecting to DJI drone...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/djiConnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ connection_type: connectionType }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Connected to DJI drone");
      return { success: true, data: data.drone_info };
    } else {
      return { success: false, error: data.error || "Failed to connect to drone" };
    }
  } catch (error) {
    console.error("❌ DJI connect error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Upload flight plan to DJI drone
 */
export async function djiUploadFlightPlan(waypoints: any[], missionSettings: any): Promise<ApiResponse<string>> {
  try {
    console.log("📤 Uploading flight plan to drone...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/djiUploadFlightPlan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        waypoints,
        mission_settings: missionSettings,
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Flight plan uploaded");
      return { success: true, data: data.mission_id };
    } else {
      return { success: false, error: data.error || "Failed to upload flight plan" };
    }
  } catch (error) {
    console.error("❌ Upload flight plan error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Start autonomous flight mission
 */
export async function djiStartMission(missionId: string): Promise<ApiResponse<string>> {
  try {
    console.log("🚀 Starting mission...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/djiStartMission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mission_id: missionId }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Mission started");
      return { success: true, data: data.status };
    } else {
      return { success: false, error: data.error || "Failed to start mission" };
    }
  } catch (error) {
    console.error("❌ Start mission error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Send manual control commands to drone
 */
export async function djiManualControl(command: string, parameters: any): Promise<ApiResponse<boolean>> {
  try {
    console.log("🎮 Sending manual control command:", command);
    
    const response = await fetch(`${FUNCTIONS_BASE}/djiManualControl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command, parameters }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Manual control command sent");
      return { success: true, data: true };
    } else {
      return { success: false, error: data.error || "Failed to send command" };
    }
  } catch (error) {
    console.error("❌ Manual control error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Command drone to return home
 */
export async function djiReturnHome(): Promise<ApiResponse<boolean>> {
  try {
    console.log("🏠 Commanding drone to return home...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/djiReturnHome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Return home command sent");
      return { success: true, data: true };
    } else {
      return { success: false, error: data.error || "Failed to return home" };
    }
  } catch (error) {
    console.error("❌ Return home error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Pause current flight mission
 */
export async function djiPauseMission(): Promise<ApiResponse<boolean>> {
  try {
    console.log("⏸️ Pausing mission...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/djiPauseMission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Mission paused");
      return { success: true, data: true };
    } else {
      return { success: false, error: data.error || "Failed to pause mission" };
    }
  } catch (error) {
    console.error("❌ Pause mission error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Resume paused flight mission
 */
export async function djiResumeMission(): Promise<ApiResponse<boolean>> {
  try {
    console.log("▶️ Resuming mission...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/djiResumeMission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Mission resumed");
      return { success: true, data: true };
    } else {
      return { success: false, error: data.error || "Failed to resume mission" };
    }
  } catch (error) {
    console.error("❌ Resume mission error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Stop current flight mission (drone hovers)
 */
export async function djiStopMission(): Promise<ApiResponse<boolean>> {
  try {
    console.log("⏹️ Stopping mission...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/djiStopMission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Mission stopped");
      return { success: true, data: true };
    } else {
      return { success: false, error: data.error || "Failed to stop mission" };
    }
  } catch (error) {
    console.error("❌ Stop mission error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Disconnect from DJI drone
 */
export async function djiDisconnect(): Promise<ApiResponse<boolean>> {
  try {
    console.log("🔌 Disconnecting from drone...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/djiDisconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Disconnected from drone");
      return { success: true, data: true };
    } else {
      return { success: false, error: data.error || "Failed to disconnect" };
    }
  } catch (error) {
    console.error("❌ Disconnect error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ==================== PROCESSING ====================

/**
 * Process drone images using Autodesk Reality Capture
 */
export async function autodeskRealityCapture(params: {
  project_id: string;
  image_urls: string[];
  processing_settings?: any;
}): Promise<ApiResponse<any>> {
  try {
    console.log("🎨 Starting Autodesk Reality Capture processing...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/autodeskRealityCapture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Processing started");
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Failed to start processing" };
    }
  } catch (error) {
    console.error("❌ Autodesk processing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ==================== SUBSCRIPTION & PAYMENT ====================

/**
 * Check subscription status
 */
export async function checkSubscription(accessKey: string): Promise<ApiResponse<Subscription>> {
  try {
    console.log("💳 Checking subscription status...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/checkSubscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessKey}`,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Subscription status retrieved");
      return { success: true, data: data.subscription };
    } else {
      return { success: false, error: data.error || "Failed to check subscription" };
    }
  } catch (error) {
    console.error("❌ Check subscription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Process payment via Square
 */
export async function squarePayment(accessKey: string, params: {
  payment_type: string;
  amount: number;
  nonce: string;
  idempotency_key: string;
}): Promise<ApiResponse<any>> {
  try {
    console.log("💰 Processing Square payment...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/squarePayment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessKey}`,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Payment processed");
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Payment failed" };
    }
  } catch (error) {
    console.error("❌ Square payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Test Square credentials (admin only)
 */
export async function testSquareCredentials(accessKey: string): Promise<ApiResponse<any>> {
  try {
    console.log("🔧 Testing Square credentials...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/testSquareCredentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessKey}`,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Square credentials tested");
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Failed to test credentials" };
    }
  } catch (error) {
    console.error("❌ Test Square credentials error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ==================== SUPPORT ====================

/**
 * Submit a support ticket
 */
export async function submitSupportTicket(accessKey: string, params: {
  subject: string;
  message: string;
  category: string;
}): Promise<ApiResponse<string>> {
  try {
    console.log("📧 Submitting support ticket...");
    
    const response = await fetch(`${FUNCTIONS_BASE}/submitSupportTicket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessKey}`,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Support ticket submitted");
      return { success: true, data: data.ticket_id };
    } else {
      return { success: false, error: data.error || "Failed to submit ticket" };
    }
  } catch (error) {
    console.error("❌ Submit support ticket error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ==================== CORE INTEGRATIONS ====================

/**
 * Invoke LLM for AI responses
 */
export async function invokeLLM(params: {
  prompt: string;
  context?: string;
  schema?: any;
}): Promise<ApiResponse<any>> {
  try {
    console.log("🤖 Invoking LLM...");
    
    const response = await fetch(`${INTEGRATIONS_BASE}/Core/InvokeLLM`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ LLM response received");
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "LLM invocation failed" };
    }
  } catch (error) {
    console.error("❌ Invoke LLM error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Upload file to public storage
 */
export async function uploadFile(file: any): Promise<ApiResponse<string>> {
  try {
    console.log("📤 Uploading file...");
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${INTEGRATIONS_BASE}/Core/UploadFile`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ File uploaded");
      return { success: true, data: data.file_url };
    } else {
      return { success: false, error: data.error || "File upload failed" };
    }
  } catch (error) {
    console.error("❌ Upload file error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Generate AI image from text prompt
 */
export async function generateImage(prompt: string): Promise<ApiResponse<string>> {
  try {
    console.log("🎨 Generating AI image...");
    
    const response = await fetch(`${INTEGRATIONS_BASE}/Core/GenerateImage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Image generated");
      return { success: true, data: data.image_url };
    } else {
      return { success: false, error: data.error || "Image generation failed" };
    }
  } catch (error) {
    console.error("❌ Generate image error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Send transactional email
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<ApiResponse<boolean>> {
  try {
    console.log("📧 Sending email...");
    
    const response = await fetch(`${INTEGRATIONS_BASE}/Core/SendEmail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Email sent");
      return { success: true, data: true };
    } else {
      return { success: false, error: data.error || "Email sending failed" };
    }
  } catch (error) {
    console.error("❌ Send email error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Extract data from uploaded file using AI
 */
export async function extractDataFromUploadedFile(fileUrl: string): Promise<ApiResponse<any>> {
  try {
    console.log("📄 Extracting data from file...");
    
    const response = await fetch(`${INTEGRATIONS_BASE}/Core/ExtractDataFromUploadedFile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_url: fileUrl }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("✅ Data extracted");
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Data extraction failed" };
    }
  } catch (error) {
    console.error("❌ Extract data error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
