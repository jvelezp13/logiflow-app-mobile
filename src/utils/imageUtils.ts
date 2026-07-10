/**
 * Image Utility Functions
 *
 * Helpers for image manipulation, compression, and conversion.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { SYNC_CONFIG } from '@constants/config';

export const deleteLocalImage = async (uri?: string | null): Promise<void> => {
  if (!uri || !uri.startsWith('file://')) {
    return;
  }

  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    // Cache cleanup must never block attendance. If Android already removed the
    // temp file, idempotent delete should absorb it; this catch is defensive.
    console.warn('[ImageUtils] Local image cleanup warning:', error);
  }
};

/**
 * Compress and resize image
 *
 * @param uri - Local image URI
 * @param quality - JPEG quality (0-1), defaults to config value
 * @returns Compressed image URI and base64
 */
export const compressImage = async (
  uri: string,
  quality: number = SYNC_CONFIG.photoQuality
): Promise<{ uri: string; base64: string | null }> => {
  try {
    // Two-pass strategy to reduce peak memory on low-RAM devices:
    // Pass 1 resizes + compresses without producing base64 so the native
    // bitmap can be GC'd before pass 2 reads the small JPEG into a string.
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: 640,
          },
        },
      ],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      }
    );

    const base64 = await imageToBase64(resized.uri);

    return {
      uri: resized.uri,
      base64,
    };
  } catch (error) {
    console.error('[ImageUtils] Compression error:', error);
    throw new Error('Error al comprimir imagen');
  }
};

/**
 * Convert image to base64
 *
 * @param uri - Local image URI
 * @returns Base64 string
 */
export const imageToBase64 = async (uri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [],
      {
        base64: true,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    if (!result.base64) {
      throw new Error('Failed to convert image to base64');
    }

    if (result.uri && result.uri !== uri) {
      await deleteLocalImage(result.uri);
    }

    return result.base64;
  } catch (error) {
    console.error('[ImageUtils] Base64 conversion error:', error);
    throw new Error('Error al convertir imagen');
  }
};

/**
 * Validate image size
 *
 * @param base64 - Base64 image string
 * @returns Boolean indicating if size is acceptable
 */
export const isImageSizeValid = (base64: string): boolean => {
  // Calculate size in bytes (base64 encoding adds ~33% overhead)
  const sizeInBytes = (base64.length * 3) / 4;
  return sizeInBytes <= SYNC_CONFIG.photoMaxSize;
};

/**
 * Get image file size in MB
 *
 * @param base64 - Base64 image string
 * @returns Size in MB
 */
export const getImageSizeMB = (base64: string): number => {
  const sizeInBytes = (base64.length * 3) / 4;
  return Number((sizeInBytes / (1024 * 1024)).toFixed(2));
};

/**
 * Generate unique filename for image
 *
 * @param userId - User ID
 * @param type - Attendance type ('clock_in' or 'clock_out')
 * @returns Unique filename
 */
export const generateImageFilename = (
  userId: string,
  type: 'clock_in' | 'clock_out'
): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `attendance_${type}_${userId}_${timestamp}_${randomStr}.jpg`;
};
