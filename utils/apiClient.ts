
/**
 * PhotoForge API Client
 * 
 * This utility provides functions to interact with the PhotoForge backend API.
 * 
 * Required API Endpoints on PhotoForge.base44.app:
 * 
 * 1. POST /api/validate-key
 *    - Validates an access key
 *    - Body: { accessKey: string }
 *    - Response: { isValid: boolean, message?: string }
 * 
 * 2. POST /api/generate
 *    - Generates an image from a text prompt
 *    - Headers: { Authorization: "Bearer <accessKey>" }
 *    - Body: { prompt: string, negativePrompt?: string }
 *    - Response: { imageUrl: string, message?: string }
 * 
 * 3. POST /api/enhance
 *    - Enhances/edits an uploaded image
 *    - Headers: { Authorization: "Bearer <accessKey>" }
 *    - Body: FormData with image file
 *    - Response: { imageUrl: string, message?: string }
 * 
 * 4. GET /api/gallery
 *    - Retrieves user's gallery of generated images
 *    - Headers: { Authorization: "Bearer <accessKey>" }
 *    - Response: { images: Array<{ id: string, url: string, prompt?: string, createdAt: string }> }
 * 
 * 5. DELETE /api/gallery/:imageId
 *    - Deletes an image from the gallery
 *    - Headers: { Authorization: "Bearer <accessKey>" }
 *    - Response: { success: boolean, message?: string }
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://photoforge.base44.app/api";
const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export async function getAccessKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
  } catch (error) {
    console.error("Error getting access key:", error);
    return null;
  }
}

export async function validateAccessKey(accessKey: string): Promise<{ isValid: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/validate-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessKey }),
    });

    return await response.json();
  } catch (error) {
    console.error("Validation error:", error);
    return { isValid: false, message: "Network error" };
  }
}

export async function generateImage(prompt: string, negativePrompt?: string): Promise<{ imageUrl?: string; message?: string }> {
  try {
    const accessKey = await getAccessKey();
    if (!accessKey) {
      return { message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessKey}`,
      },
      body: JSON.stringify({ prompt, negativePrompt }),
    });

    return await response.json();
  } catch (error) {
    console.error("Generation error:", error);
    return { message: "Network error" };
  }
}

export async function enhanceImage(imageUri: string): Promise<{ imageUrl?: string; message?: string }> {
  try {
    const accessKey = await getAccessKey();
    if (!accessKey) {
      return { message: "Not authenticated" };
    }

    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "photo.jpg",
    } as any);

    const response = await fetch(`${API_BASE_URL}/enhance`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessKey}`,
      },
      body: formData,
    });

    return await response.json();
  } catch (error) {
    console.error("Enhancement error:", error);
    return { message: "Network error" };
  }
}

export async function getGallery(): Promise<{ images?: Array<any>; message?: string }> {
  try {
    const accessKey = await getAccessKey();
    if (!accessKey) {
      return { message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/gallery`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessKey}`,
      },
    });

    return await response.json();
  } catch (error) {
    console.error("Gallery error:", error);
    return { message: "Network error" };
  }
}

export async function deleteImage(imageId: string): Promise<{ success?: boolean; message?: string }> {
  try {
    const accessKey = await getAccessKey();
    if (!accessKey) {
      return { message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/gallery/${imageId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessKey}`,
      },
    });

    return await response.json();
  } catch (error) {
    console.error("Delete error:", error);
    return { message: "Network error" };
  }
}
