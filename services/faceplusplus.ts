/**
 * Face++ API Service
 * Provides facial recognition using Face++ Search API
 */

import { dbService } from './db';

// Face++ API endpoints
const FACEPP_API_BASE = 'https://api-us.faceplusplus.com/facepp/v3';

interface FacePPCredentials {
  apiKey: string;
  apiSecret: string;
  facesetToken?: string;
}

interface DetectResult {
  success: boolean;
  faceToken?: string;
  error?: string;
}

interface SearchResult {
  success: boolean;
  matches: {
    faceToken: string;
    confidence: number;
    userId?: string;
  }[];
  thresholds?: {
    '1e-3': number;
    '1e-4': number;
    '1e-5': number;
  };
  error?: string;
}

interface FaceSetResult {
  success: boolean;
  facesetToken?: string;
  error?: string;
}

// Cache credentials to avoid fetching from DB on every call
let cachedCredentials: FacePPCredentials | null = null;

/**
 * Get Face++ credentials from database
 */
export const getCredentials = async (): Promise<FacePPCredentials | null> => {
  if (cachedCredentials?.apiKey && cachedCredentials?.apiSecret) {
    return cachedCredentials;
  }

  try {
    const apiKey = await dbService.getSetting('FACEPP_API_KEY');
    const apiSecret = await dbService.getSetting('FACEPP_API_SECRET');
    const facesetToken = await dbService.getSetting('FACEPP_FACESET_TOKEN');

    if (apiKey && apiSecret) {
      cachedCredentials = { apiKey, apiSecret, facesetToken: facesetToken || undefined };
      return cachedCredentials;
    }
  } catch (e) {
    console.error('Failed to fetch Face++ credentials:', e);
  }

  return null;
};

/**
 * Clear cached credentials (call when credentials are updated)
 */
export const clearCredentialsCache = () => {
  cachedCredentials = null;
};

/**
 * Check if Face++ is configured
 */
export const isConfigured = async (): Promise<boolean> => {
  const creds = await getCredentials();
  return !!(creds?.apiKey && creds?.apiSecret);
};

/**
 * Check if FaceSet is initialized
 */
export const hasFaceSet = async (): Promise<boolean> => {
  const creds = await getCredentials();
  return !!creds?.facesetToken;
};

/**
 * Create a new FaceSet for storing face tokens
 */
export const createFaceSet = async (displayName: string = 'FalgatesStaff'): Promise<FaceSetResult> => {
  const creds = await getCredentials();
  if (!creds) {
    return { success: false, error: 'Face++ credentials not configured' };
  }

  try {
    const formData = new FormData();
    formData.append('api_key', creds.apiKey);
    formData.append('api_secret', creds.apiSecret);
    formData.append('display_name', displayName);
    formData.append('outer_id', `falgates_${Date.now()}`);

    const response = await fetch(`${FACEPP_API_BASE}/faceset/create`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error_message) {
      return { success: false, error: data.error_message };
    }

    // Save the faceset_token to database
    await dbService.setSetting('FACEPP_FACESET_TOKEN', data.faceset_token);
    clearCredentialsCache();

    return { success: true, facesetToken: data.faceset_token };
  } catch (e: any) {
    console.error('Face++ CreateFaceSet Error:', e);
    return { success: false, error: e.message || 'Network error' };
  }
};

/**
 * Detect a face in an image and get the face_token
 */
export const detectFace = async (imageBase64: string): Promise<DetectResult> => {
  const creds = await getCredentials();
  if (!creds) {
    return { success: false, error: 'Face++ credentials not configured' };
  }

  try {
    // Remove data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const formData = new FormData();
    formData.append('api_key', creds.apiKey);
    formData.append('api_secret', creds.apiSecret);
    formData.append('image_base64', cleanBase64);

    const response = await fetch(`${FACEPP_API_BASE}/detect`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error_message) {
      return { success: false, error: data.error_message };
    }

    if (!data.faces || data.faces.length === 0) {
      return { success: false, error: 'No face detected in the image' };
    }

    // Return the first (largest) face token
    return { success: true, faceToken: data.faces[0].face_token };
  } catch (e: any) {
    console.error('Face++ Detect Error:', e);
    return { success: false, error: e.message || 'Network error' };
  }
};

/**
 * Add a face to the FaceSet
 */
export const addFaceToSet = async (faceToken: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  const creds = await getCredentials();
  if (!creds?.facesetToken) {
    return { success: false, error: 'FaceSet not initialized' };
  }

  try {
    const formData = new FormData();
    formData.append('api_key', creds.apiKey);
    formData.append('api_secret', creds.apiSecret);
    formData.append('faceset_token', creds.facesetToken);
    formData.append('face_tokens', faceToken);

    const response = await fetch(`${FACEPP_API_BASE}/faceset/addface`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error_message) {
      return { success: false, error: data.error_message };
    }

    // Set user_id for the face (for identification in search results)
    await setFaceUserId(faceToken, userId);

    return { success: true };
  } catch (e: any) {
    console.error('Face++ AddFace Error:', e);
    return { success: false, error: e.message || 'Network error' };
  }
};

/**
 * Set user_id for a face token
 */
const setFaceUserId = async (faceToken: string, userId: string): Promise<void> => {
  const creds = await getCredentials();
  if (!creds) return;

  try {
    const formData = new FormData();
    formData.append('api_key', creds.apiKey);
    formData.append('api_secret', creds.apiSecret);
    formData.append('face_token', faceToken);
    formData.append('user_id', userId);

    await fetch(`${FACEPP_API_BASE}/face/setuserid`, {
      method: 'POST',
      body: formData,
    });
  } catch (e) {
    console.error('Face++ SetUserId Error:', e);
  }
};

/**
 * Remove a face from the FaceSet
 */
export const removeFaceFromSet = async (faceToken: string): Promise<{ success: boolean; error?: string }> => {
  const creds = await getCredentials();
  if (!creds?.facesetToken) {
    return { success: false, error: 'FaceSet not initialized' };
  }

  try {
    const formData = new FormData();
    formData.append('api_key', creds.apiKey);
    formData.append('api_secret', creds.apiSecret);
    formData.append('faceset_token', creds.facesetToken);
    formData.append('face_tokens', faceToken);

    const response = await fetch(`${FACEPP_API_BASE}/faceset/removeface`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error_message) {
      return { success: false, error: data.error_message };
    }

    return { success: true };
  } catch (e: any) {
    console.error('Face++ RemoveFace Error:', e);
    return { success: false, error: e.message || 'Network error' };
  }
};

/**
 * Search for a face in the FaceSet
 * Returns matching faces with confidence scores
 */
export const searchFace = async (imageBase64: string): Promise<SearchResult> => {
  const creds = await getCredentials();
  if (!creds?.facesetToken) {
    return { success: false, matches: [], error: 'FaceSet not initialized' };
  }

  try {
    // Remove data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const formData = new FormData();
    formData.append('api_key', creds.apiKey);
    formData.append('api_secret', creds.apiSecret);
    formData.append('faceset_token', creds.facesetToken);
    formData.append('image_base64', cleanBase64);
    formData.append('return_result_count', '5'); // Return top 5 matches

    const response = await fetch(`${FACEPP_API_BASE}/search`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error_message) {
      return { success: false, matches: [], error: data.error_message };
    }

    if (!data.results || data.results.length === 0) {
      return { success: true, matches: [], thresholds: data.thresholds };
    }

    const matches = data.results.map((r: any) => ({
      faceToken: r.face_token,
      confidence: r.confidence,
      userId: r.user_id,
    }));

    return {
      success: true,
      matches,
      thresholds: data.thresholds,
    };
  } catch (e: any) {
    console.error('Face++ Search Error:', e);
    return { success: false, matches: [], error: e.message || 'Network error' };
  }
};

/**
 * Get FaceSet details (number of faces, etc.)
 */
export const getFaceSetInfo = async (): Promise<{ success: boolean; faceCount?: number; error?: string }> => {
  const creds = await getCredentials();
  if (!creds?.facesetToken) {
    return { success: false, error: 'FaceSet not initialized' };
  }

  try {
    const formData = new FormData();
    formData.append('api_key', creds.apiKey);
    formData.append('api_secret', creds.apiSecret);
    formData.append('faceset_token', creds.facesetToken);

    const response = await fetch(`${FACEPP_API_BASE}/faceset/getdetail`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error_message) {
      return { success: false, error: data.error_message };
    }

    return { success: true, faceCount: data.face_count || 0 };
  } catch (e: any) {
    console.error('Face++ GetFaceSetInfo Error:', e);
    return { success: false, error: e.message || 'Network error' };
  }
};

