import cloudinary from '../config/cloudinary';
import { PRESETS } from '../config/cloudinary';
import type { UploadApiResponse } from 'cloudinary';

interface UploadOptions {
  preset: keyof typeof PRESETS;
  folder?: string;
  tags?: string[];
  context?: Record<string, string>;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

interface TransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit' | 'pad';
  quality?: 'auto' | number;
  format?: 'webp' | 'jpg' | 'png' | 'auto';
  gravity?: 'face' | 'auto' | 'center';
}

export class CloudinaryService {
  private readonly DEFAULT_TIMEOUT = 60000;

  private validatePublicId(publicId: string): void {
    if (!publicId || typeof publicId !== 'string') {
      throw new Error('publicId es requerido');
    }
    if (/[?&#\\%<>=+]/.test(publicId)) {
      throw new Error('publicId contiene caracteres no permitidos');
    }
  }

  private validateTag(tag: string): void {
    if (!tag || typeof tag !== 'string') {
      throw new Error('tag es requerido');
    }
    if (tag.length > 100) {
      throw new Error('tag excede 100 caracteres');
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    options: UploadOptions,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Upload timeout after ${timeout}ms`));
      }, timeout);

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          upload_preset: PRESETS[options.preset],
          folder: options.folder,
          tags: options.tags,
          context: options.context,
          resource_type: options.resourceType || 'auto',
          use_filename: true,
          unique_filename: true
        },
        (error, result) => {
          clearTimeout(timer);
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error('Upload failed'));
        }
      );

      uploadStream.end(buffer);
    });
  }

  async uploadOptimized(
    buffer: Buffer,
    filename: string,
    options: UploadOptions & { maxWidth?: number; maxHeight?: number },
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<UploadApiResponse> {
    const transformation: Record<string, any> = {};

    if (options.maxWidth || options.maxHeight) {
      transformation.width = options.maxWidth;
      transformation.height = options.maxHeight;
      transformation.crop = 'limit';
      transformation.quality = 'auto:good';
      transformation.fetch_format = 'auto';
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Upload timeout after ${timeout}ms`));
      }, timeout);

      const uploadOptions: Record<string, any> = {
        upload_preset: PRESETS[options.preset],
        folder: options.folder,
        tags: options.tags,
        resource_type: options.resourceType || 'image'
      };

      if (Object.keys(transformation).length > 0) {
        uploadOptions.transformation = transformation;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          clearTimeout(timer);
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error('Upload failed'));
        }
      );

      uploadStream.end(buffer);
    });
  }

  getTransformedUrl(
    publicId: string,
    options: TransformOptions = {}
  ): string {
    const transformation: Record<string, any> = {};

    if (options.width) transformation.width = options.width;
    if (options.height) transformation.height = options.height;
    if (options.crop) transformation.crop = options.crop;
    if (options.quality) transformation.quality = options.quality;
    if (options.format) transformation.fetch_format = options.format;
    if (options.gravity) transformation.gravity = options.gravity;

    return cloudinary.url(publicId, {
      transformation: Object.keys(transformation).length > 0 ? transformation : undefined
    });
  }

  generateSignedUrl(
    publicId: string,
    options: TransformOptions = {},
    expiresAt?: number
  ): string {
    const transformation: Record<string, any> = {};

    if (options.width) transformation.width = options.width;
    if (options.height) transformation.height = options.height;
    if (options.crop) transformation.crop = options.crop;
    if (options.quality) transformation.quality = options.quality;
    if (options.format) transformation.fetch_format = options.format;
    if (options.gravity) transformation.gravity = options.gravity;

    return cloudinary.url(publicId, {
      sign_url: true,
      expires_at: expiresAt || Math.floor(Date.now() / 1000) + 3600,
      transformation: Object.keys(transformation).length > 0 ? transformation : undefined
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    this.validatePublicId(publicId);
    await cloudinary.uploader.destroy(publicId);
  }

  async searchByTag(tag: string): Promise<any> {
    this.validateTag(tag);
    return await cloudinary.api.resources({
      type: 'upload',
      tag: tag,
      max_results: 100
    });
  }
}

export const cloudinaryService = new CloudinaryService();
