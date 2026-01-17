import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'opsflow_jwt_token';
const USER_KEY = 'opsflow_user';

export interface StoredUser {
  id: string;
  username: string;
  email?: string;
}

/**
 * Store JWT token securely using Keychain
 */
export async function storeToken(token: string): Promise<boolean> {
  try {
    await Keychain.setInternetCredentials(TOKEN_KEY, TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error('Failed to store token:', error);
    return false;
  }
}

/**
 * Retrieve JWT token from Keychain
 */
export async function getToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getInternetCredentials(TOKEN_KEY);
    if (credentials && credentials.password) {
      return credentials.password;
    }
    return null;
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}

/**
 * Remove JWT token from Keychain
 */
export async function removeToken(): Promise<boolean> {
  try {
    await Keychain.resetInternetCredentials(TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Failed to remove token:', error);
    return false;
  }
}

/**
 * Store user data in AsyncStorage (less sensitive, can use AsyncStorage)
 */
export async function storeUser(user: StoredUser): Promise<boolean> {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  } catch (error) {
    console.error('Failed to store user:', error);
    return false;
  }
}

/**
 * Get stored user data
 */
export async function getUser(): Promise<StoredUser | null> {
  try {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    if (userStr) {
      return JSON.parse(userStr) as StoredUser;
    }
    return null;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Clear all stored auth data
 */
export async function clearAuth(): Promise<void> {
  await removeToken();
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}
