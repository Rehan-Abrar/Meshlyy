import { useState, useCallback } from 'react';
import { apiClient } from './apiClient';

/**
 * useFileUpload — handles the full Cloudinary signed upload flow.
 * 1. Gets signed upload params from backend
 * 2. Uploads file directly to Cloudinary
 * 3. Returns the secure URL
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  const upload = useCallback(async (file, kind = 'avatar') => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setUploadedUrl(null);

    try {
      // Step 1: Get signed upload URL from backend
      const response = await apiClient.get(`/media/upload-url?kind=${kind}`);
      const uploadData = response?.data;

      if (!uploadData?.uploadUrl || !uploadData?.params) {
        throw new Error('Failed to get upload credentials');
      }

      // Step 2: Validate file size against backend constraints
      const maxSize = uploadData.constraints?.maxFileSizeBytes;
      if (maxSize && file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        throw new Error(`File is too large. Maximum size is ${maxMB} MB.`);
      }

      // Step 3: Validate file format
      const allowedFormats = uploadData.constraints?.allowedFormats;
      if (allowedFormats && allowedFormats.length > 0) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext && !allowedFormats.includes(ext)) {
          throw new Error(`File format .${ext} is not allowed. Accepted: ${allowedFormats.join(', ')}`);
        }
      }

      // Step 4: Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', uploadData.apiKey);
      formData.append('timestamp', String(uploadData.params.timestamp));
      formData.append('signature', uploadData.params.signature);
      formData.append('folder', uploadData.params.folder);
      if (uploadData.params.allowed_formats) {
        formData.append('allowed_formats', uploadData.params.allowed_formats);
      }

      const xhr = new XMLHttpRequest();

      const result = await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Invalid response from upload service'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed. Check your connection.')));
        xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled.')));

        xhr.open('POST', uploadData.uploadUrl);
        xhr.send(formData);
      });

      const secureUrl = result.secure_url || result.url;
      if (!secureUrl) {
        throw new Error('Upload succeeded but no URL was returned');
      }

      setUploadedUrl(secureUrl);
      setProgress(100);
      return secureUrl;
    } catch (err) {
      const message = err.message || 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedUrl(null);
  }, []);

  return { upload, uploading, progress, error, uploadedUrl, reset };
}
