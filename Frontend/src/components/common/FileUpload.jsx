import { useState, useRef } from 'react';
import { useFileUpload } from '../../utils/useFileUpload';
import styles from './FileUpload.module.css';

/**
 * FileUpload — Reusable upload component with drag-and-drop, preview, and Cloudinary integration.
 *
 * Props:
 *   kind      — 'avatar' | 'logo' | 'portfolio' | 'media-kit'
 *   accept    — file input accept string (default: 'image/*')
 *   maxSizeMB — client-side max size hint (backend also validates)
 *   onUploadComplete — callback with secure URL
 *   previewShape — 'circle' | 'square' (for image preview)
 *   label     — optional custom label text
 */
const FileUpload = ({
  kind = 'avatar',
  accept = 'image/*',
  maxSizeMB = 8,
  onUploadComplete,
  previewShape = 'circle',
  label,
}) => {
  const { upload, uploading, progress, error, uploadedUrl, reset } = useFileUpload();
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const isImage = accept.startsWith('image');

  const handleFile = async (file) => {
    if (!file) return;

    // Client-side size check
    if (file.size > maxSizeMB * 1024 * 1024) {
      reset();
      return;
    }

    // Generate preview for images
    if (isImage && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    try {
      const url = await upload(file, kind);
      if (onUploadComplete) {
        onUploadComplete(url);
      }
    } catch {
      // Error is already set in the hook
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    reset();
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onUploadComplete) onUploadComplete(null);
  };

  const defaultLabel = kind === 'avatar' ? 'Upload Profile Picture'
    : kind === 'logo' ? 'Upload Brand Logo'
    : kind === 'media-kit' ? 'Upload Media Kit'
    : 'Upload File';

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''} ${uploading ? styles.uploading : ''} ${uploadedUrl ? styles.uploaded : ''} ${error ? styles.hasError : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        aria-label={label || defaultLabel}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className={styles.hiddenInput}
          tabIndex={-1}
        />

        {uploadedUrl && preview ? (
          <div className={styles.previewContainer}>
            <img
              src={preview}
              alt="Upload preview"
              className={`${styles.previewImage} ${previewShape === 'circle' ? styles.previewCircle : styles.previewSquare}`}
            />
            <button type="button" className={styles.removeBtn} onClick={handleRemove} aria-label="Remove uploaded file">
              ✕
            </button>
          </div>
        ) : uploadedUrl && !preview ? (
          <div className={styles.fileSuccess}>
            <span className={styles.successIcon}>✓</span>
            <span className={styles.successText}>File uploaded</span>
            <button type="button" className={styles.removeBtn} onClick={handleRemove} aria-label="Remove uploaded file">
              ✕
            </button>
          </div>
        ) : uploading ? (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressText}>{progress}%</span>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.uploadIcon}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 18h16" />
              </svg>
            </div>
            <div className={styles.uploadText}>{label || defaultLabel}</div>
            <div className={styles.uploadSub}>
              Click to upload or drag and drop · Max {maxSizeMB} MB
            </div>
          </div>
        )}
      </div>
      {error && <p className={styles.errorText} role="alert">{error}</p>}
    </div>
  );
};

export default FileUpload;
