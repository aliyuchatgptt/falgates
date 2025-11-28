
import { GoogleGenAI, Type } from "@google/genai";
import { StaffMember } from "../types";
import { dbService } from "./db";

// We use the new Flash 2.5 for speed and multimodal capabilities.
const MODEL_NAME = "gemini-2.5-flash";

// Cache the API key to avoid fetching from DB on every call
let cachedApiKey: string | null = null;

const getClient = async () => {
  // Check cached key first
  if (cachedApiKey) {
    return new GoogleGenAI({ apiKey: cachedApiKey });
  }

  // Fetch from Supabase database
  try {
    const dbKey = await dbService.getSetting("GEMINI_API_KEY");
    if (dbKey) {
      cachedApiKey = dbKey;
      return new GoogleGenAI({ apiKey: dbKey });
    }
  } catch (e) {
    console.error("Failed to fetch API key from database:", e);
  }

  // Fallback to Environment Variable
  const envKey = process.env.API_KEY;
  const validEnvKey = envKey && envKey !== "undefined" ? envKey : null;

  if (validEnvKey) {
    cachedApiKey = validEnvKey;
    return new GoogleGenAI({ apiKey: validEnvKey });
  }

  throw new Error("API Key not found. Please configure it in Settings.");
};

// Clear cached key (call this when key is updated)
export const clearApiKeyCache = () => {
  cachedApiKey = null;
};

// Helper to strip markdown code blocks if Gemini adds them
const parseJSON = (text: string | undefined) => {
  if (!text) return null;
  try {
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    return null;
  }
};

export const checkImageQuality = async (imageBase64: string): Promise<{ valid: boolean; reason: string }> => {
  try {
    const ai = await getClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
            { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
            { text: "Analyze this image for use in a staff ID system. Is there exactly one human face? Is it clearly visible and well-lit? Respond with JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            valid: { type: Type.BOOLEAN, description: "True if the image is a clear, single face suitable for ID." },
            reason: { type: Type.STRING, description: "Short explanation of the quality check result." },
          },
          required: ["valid", "reason"],
        },
      },
    });

    const result = parseJSON(response.text);
    return result || { valid: true, reason: "AI Check Skipped (Parse Error)" };
  } catch (error) {
    console.error("Gemini Image Check Error:", error);
    // Fallback to allow operation if offline or API error, but warn.
    return { valid: true, reason: "AI Check Skipped (Network/API Error)" }; 
  }
};

// Enhanced prompt for facial recognition with specific landmark focus
const VERIFICATION_PROMPT = `You are a facial recognition expert. Compare the REFERENCE image (first) with the LIVE capture (second).

Analyze these specific facial features:
1. FACE SHAPE: Overall face structure (oval, round, square, heart-shaped)
2. EYES: Shape, spacing, brow ridge, and eye socket depth
3. NOSE: Bridge width, tip shape, nostril shape
4. MOUTH: Lip shape, mouth width relative to face
5. JAW/CHIN: Jawline definition, chin shape
6. EARS: Position, size (if visible)
7. FACIAL PROPORTIONS: Distance ratios between features

IMPORTANT RULES:
- Focus on STRUCTURAL features that don't change (bone structure, eye spacing, nose shape)
- IGNORE temporary differences: lighting, expression, glasses, facial hair, makeup, head angle
- Be STRICT: Only mark as match if you're highly confident it's the same person
- A confidence below 75 should result in match=false

Provide your analysis with a confidence score from 0-100.`;

/**
 * Uses Gemini to compare a live capture against a reference image with enhanced prompts.
 */
export const verifyIdentityWithGemini = async (
  liveImageBase64: string, 
  referenceImageBase64: string
): Promise<{ match: boolean; confidence: number; explanation: string }> => {
  try {
    const ai = await getClient();
    const cleanLive = liveImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const cleanRef = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
            { inlineData: { mimeType: "image/jpeg", data: cleanRef } },
            { inlineData: { mimeType: "image/jpeg", data: cleanLive } },
            { text: VERIFICATION_PROMPT }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            match: { type: Type.BOOLEAN, description: "True only if highly confident it's the same person" },
            confidence: { type: Type.NUMBER, description: "Confidence score 0-100 based on facial landmark analysis" },
            explanation: { type: Type.STRING, description: "Brief explanation of key matching/non-matching features" }
          },
          required: ["match", "confidence", "explanation"]
        }
      }
    });

     const result = parseJSON(response.text);
     return result || { match: false, confidence: 0, explanation: "Verification Failed (Parse Error)" };

  } catch (error) {
    console.error("Gemini Verification Error:", error);
    return { match: false, confidence: 0, explanation: "AI Service Unavailable" };
  }
};

/**
 * Verifies identity against multiple reference images using consensus matching.
 * Returns a match only if the majority of images agree.
 */
export const verifyIdentityWithConsensus = async (
  liveImageBase64: string,
  referenceImages: string[],
  requiredMatches: number = 2,
  confidenceThreshold: number = 85
): Promise<{ match: boolean; confidence: number; explanation: string; matchCount: number }> => {
  if (referenceImages.length === 0) {
    return { match: false, confidence: 0, explanation: "No reference images available", matchCount: 0 };
  }

  const results: { match: boolean; confidence: number; explanation: string }[] = [];
  
  // Compare against each reference image
  for (const refImage of referenceImages) {
    const result = await verifyIdentityWithGemini(liveImageBase64, refImage);
    results.push(result);
  }

  // Count matches that meet the confidence threshold
  const validMatches = results.filter(r => r.match && r.confidence >= confidenceThreshold);
  const matchCount = validMatches.length;
  
  // Calculate average confidence of valid matches (or all results if no valid matches)
  const avgConfidence = validMatches.length > 0
    ? validMatches.reduce((sum, r) => sum + r.confidence, 0) / validMatches.length
    : results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  // Consensus: require minimum number of matches
  const isMatch = matchCount >= requiredMatches;
  
  // Build explanation
  const explanation = isMatch
    ? `Verified with ${matchCount}/${referenceImages.length} image matches (avg ${avgConfidence.toFixed(0)}% confidence)`
    : matchCount > 0
      ? `Only ${matchCount}/${referenceImages.length} matches (need ${requiredMatches}). ${results[0]?.explanation || ''}`
      : `No matches found. ${results[0]?.explanation || 'Identity could not be verified.'}`;

  return {
    match: isMatch,
    confidence: avgConfidence,
    explanation,
    matchCount
  };
};

export const generateStaffInsights = async (staff: StaffMember[]): Promise<string> => {
  try {
    const ai = await getClient();
    const distribution = staff.reduce((acc, curr) => {
      acc[curr.assignedUnit] = (acc[curr.assignedUnit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const prompt = `
      Analyze the following staff distribution data for a rice factory.
      Total Staff: ${staff.length}
      Distribution by Unit: ${JSON.stringify(distribution)}
      
      Provide a concise, strategic insight in 2-3 sentences. 
      Identify if there is any imbalance in staff allocation (e.g., too many people in one platform vs another) and suggest a simple optimization.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { text: prompt }
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Unable to generate AI insights at this time.";
  }
};
