
/**
 * PhotoForge API Client
 * 
 * This utility provides functions to interact with the PhotoForge backend API.
 * 
 * Base URL: https://photoforge.base44.app
 * 
 * Required API Endpoints:
 * 
 * 1. POST /api/functions/validate-key
 *    - Validates an access key
 *    - Body: { accessKey: string }
 *    - Response: { success: boolean, user?: { id, email, full_name, role }, error?: string }
 * 
 * 2. POST /api/functions/createProjectMobile
 *    - Creates a new project
 *    - Body: { access_key: string, project: object }
 *    - Response: { success: boolean, data?: object, error?: string }
 * 
 * 3. GET /api/entities/Project
 *    - Retrieves user's projects
 *    - Headers: { Authorization: "Bearer <accessKey>" }
 *    - Response: Array of projects
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const WEBAPP_URL = "https://photoforge.base44.app";
const FUNCTIONS_BASE = `${WEBAPP_URL}/api/functions`;
const ENTITIES_BASE = `${WEBAPP_URL}/api/entities`;
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

export async function getAccessKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
  } catch (error) {
    console.error("❌ Error getting access key:", error);
    return null;
  }
}

/**
 * Validate access key with the backend
 * @param accessKey - 24 character access key from user
 * @returns User data if valid, error if invalid
 */
export async function validateAccessKey(accessKey: string): Promise<ApiResponse<User>> {
  try {
    console.log("\n========== VALIDATING ACCESS KEY ==========");
    console.log("🔑 Starting validation...");
    console.log("📍 Endpoint:", `${FUNCTIONS_BASE}/validate-key`);
    console.log("🔐 Access key (first 10 chars):", accessKey.substring(0, 10) + "...");
    console.log("📏 Access key length:", accessKey.length);
    console.log("⏰ Timestamp:", new Date().toISOString());
    
    const requestBody = { accessKey };
    console.log("📦 Request body:", JSON.stringify(requestBody));
    
    const response = await fetch(`${FUNCTIONS_BASE}/validate-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📨 Response received");
    console.log("📊 Status:", response.status, response.statusText);
    console.log("✓ OK:", response.ok);
    
    const responseText = await response.text();
    console.log("📄 Response body (raw):", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log("📋 Parsed data:", JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      console.error("📄 Raw response (first 200 chars):", responseText.substring(0, 200));
      console.log("========== VALIDATION FAILED (PARSE ERROR) ==========\n");
      return {
        success: false,
        error: "Invalid server response format",
      };
    }

    if (response.ok && data.success) {
      console.log("✅ Access key is VALID");
      console.log("👤 User:", data.user?.email);
      console.log("========== VALIDATION SUCCESS ==========\n");
      return {
        success: true,
        data: data.user,
      };
    } else {
      const errorMsg = data.error || "Invalid access key";
      console.log("❌ Access key is INVALID");
      console.log("💬 Error:", errorMsg);
      console.log("========== VALIDATION FAILED ==========\n");
      return {
        success: false,
        error: errorMsg,
      };
    }
  } catch (error) {
    console.error("❌ EXCEPTION during validation");
    console.error("🔥 Error type:", error?.constructor?.name);
    console.error("💬 Error message:", error instanceof Error ? error.message : "Unknown error");
    console.error("📚 Stack trace:", error instanceof Error ? error.stack : "No stack");
    console.log("========== VALIDATION ERROR ==========\n");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get projects with authenticated access key
 * @param accessKey - Validated access key
 */
export async function getProjects(accessKey: string): Promise<ApiResponse<any[]>> {
  try {
    console.log("📂 Fetching projects...");
    console.log("📍 Endpoint:", `${ENTITIES_BASE}/Project`);
    
    const response = await fetch(`${ENTITIES_BASE}/Project`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessKey}`,
      },
    });

    console.log("📊 Projects response status:", response.status);

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
 * Create a new project
 * @param accessKey - Validated access key
 * @param project - Project data
 */
export async function createProject(accessKey: string, project: any): Promise<ApiResponse<any>> {
  try {
    console.log("➕ Creating project...");
    console.log("📍 Endpoint:", `${FUNCTIONS_BASE}/createProjectMobile`);
    
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

    console.log("📊 Create project response status:", response.status);
    
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
 * Generate topographic map background
 * @param center - [latitude, longitude]
 * @param zoom - Zoom level (3-5 recommended for background)
 */
export async function generateTopoMap(center?: [number, number], zoom: number = 3): Promise<ApiResponse<string>> {
  try {
    console.log("🗺️ Generating topographic map...");
    console.log("📍 Endpoint:", `${FUNCTIONS_BASE}/generateTopoMap`);
    
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

    console.log("📊 Topo map response status:", response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Topographic map generated");
      return { success: true, data: data.imageUrl || data.url };
    } else {
      const errorText = await response.text();
      console.error("❌ Failed to generate topo map:", errorText);
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
