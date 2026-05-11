import { Router } from 'express';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import { verifyToken, loadAuthContext } from '../middleware/auth';
import { Errors } from '../lib/errors';
import config from '../config/env';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

router.use(verifyToken, loadAuthContext);

const UploadKindSchema = z.enum(['avatar', 'logo', 'portfolio', 'media-kit']);

const UploadUrlQuerySchema = z.object({
  kind: UploadKindSchema,
  resourceType: z.enum(['image', 'video', 'raw']).optional(),
});

type UploadKind = z.infer<typeof UploadKindSchema>;

type UploadPolicy = {
  resourceTypes: Array<'image' | 'video' | 'raw'>;
  allowedFormats?: string[];
  maxFileSizeBytes: number;
};

const UPLOAD_POLICIES: Record<UploadKind, UploadPolicy> = {
  avatar: {
    resourceTypes: ['image'],
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSizeBytes: 8 * 1024 * 1024,
  },
  logo: {
    resourceTypes: ['image'],
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    maxFileSizeBytes: 10 * 1024 * 1024,
  },
  portfolio: {
    resourceTypes: ['image', 'video'],
    maxFileSizeBytes: 100 * 1024 * 1024,
  },
  'media-kit': {
    resourceTypes: ['raw'],
    allowedFormats: ['pdf', 'ppt', 'pptx', 'doc', 'docx'],
    maxFileSizeBytes: 30 * 1024 * 1024,
  },
};

function normalizeRoleFolder(role: string): 'brand' | 'influencer' | 'admin' {
  const value = String(role || '').toUpperCase();
  if (value === 'BRAND') return 'brand';
  if (value === 'INFLUENCER') return 'influencer';
  return 'admin';
}

router.get('/upload-url', async (req: AuthenticatedRequest, res, next) => {
  try {
    const auth = req.auth!;
    const query = UploadUrlQuerySchema.parse(req.query ?? {});

    const policy = UPLOAD_POLICIES[query.kind];
    const resourceType = query.resourceType || policy.resourceTypes[0];

    if (!policy.resourceTypes.includes(resourceType)) {
      throw Errors.VALIDATION_ERROR(
        `resourceType must be one of: ${policy.resourceTypes.join(', ')}`,
        'resourceType'
      );
    }

    const roleFolder = normalizeRoleFolder(auth.role);
    const folder = `meshlyy/${roleFolder}/${auth.userId}/${query.kind}`;

    const timestamp = Math.floor(Date.now() / 1000);

    const signatureParams: Record<string, string | number | boolean> = {
      folder,
      overwrite: false,
      unique_filename: true,
      timestamp,
    };

    if (policy.allowedFormats && policy.allowedFormats.length > 0) {
      signatureParams.allowed_formats = policy.allowedFormats.join(',');
    }

    const signature = cloudinary.utils.api_sign_request(signatureParams, config.CLOUDINARY_API_SECRET);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    // Cloudinary signatures are valid for up to 1 hour based on timestamp.
    const expiresAt = new Date((timestamp + 60 * 60) * 1000).toISOString();

    res.json({
      data: {
        uploadUrl,
        cloudName: config.CLOUDINARY_CLOUD_NAME,
        apiKey: config.CLOUDINARY_API_KEY,
        folder,
        kind: query.kind,
        resourceType,
        expiresAt,
        params: {
          timestamp,
          signature,
          folder,
          overwrite: false,
          unique_filename: true,
          ...(policy.allowedFormats?.length ? { allowed_formats: policy.allowedFormats.join(',') } : {}),
        },
        constraints: {
          maxFileSizeBytes: policy.maxFileSizeBytes,
          allowedFormats: policy.allowedFormats || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
