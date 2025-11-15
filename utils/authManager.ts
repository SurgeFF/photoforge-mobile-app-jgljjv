
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY_STORAGE = '@photoforge_access_key';
const USER_DATA_STORAGE = '@photoforge_user_data';

export interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

/**
 * Save access key to secure storage
 */
export async function saveAccessKey(accessKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACCESS_KEY_STORAGE, accessKey);
    console.log('💾 Access key saved');
  } catch (error) {
    console.error('Failed to save access key:', error);
    throw error;
  }
}

/**
 * Get saved access key
 */
export async function getAccessKey(): Promise<string | null> {
  try {
    const key = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
    console.log('📥 Retrieved access key:', key ? 'exists' : 'null');
    return key;
  } catch (error) {
    console.error('Failed to get access key:', error);
    return null;
  }
}

/**
 * Save user data
 */
export async function saveUserData(user: StoredUser): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_DATA_STORAGE, JSON.stringify(user));
    console.log('💾 User data saved');
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
}

/**
 * Get saved user data
 */
export async function getUserData(): Promise<StoredUser | null> {
  try {
    const data = await AsyncStorage.getItem(USER_DATA_STORAGE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

/**
 * Clear all auth data (logout)
 */
export async function clearAuthData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([ACCESS_KEY_STORAGE, USER_DATA_STORAGE]);
    console.log('🗑️ Auth data cleared');
  } catch (error) {
    console.error('Failed to clear auth data:', error);
  }
}
