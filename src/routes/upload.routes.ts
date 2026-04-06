import { Hono } from 'hono';
import { cloudinaryService } from '../services/cloudinary.service';
import { parseMultipart, validateImage, validateDocument } from '../middleware/upload';
import { authenticate, requirePermission, requireWeb } from '../middleware/auth';
import { HTTPException } from 'hono/http-exception';
import type { FileUpload } from '../types';

const router = new Hono();

router.use('*', authenticate);

// Fotos de campo - Web y App
router.post('/fotos-campo', 
  requirePermission('upload'),
  parseMultipart, 
  validateImage, 
  async (c) => {
    const files: FileUpload[] = c.get('files');
    const fields = c.get('fields');
    const auth = c.get('auth');
    
    const bitacoraId = fields.bitacora_id;
    const tecnicoId = fields.tecnico_id;

    if (!bitacoraId || !tecnicoId) {
      throw new HTTPException(400, { message: 'bitacora_id y tecnico_id son requeridos' });
    }

    const maxFiles = auth.clientType === 'app' ? 10 : 20;
    if (files.length > maxFiles) {
      throw new HTTPException(400, { message: `Máximo ${maxFiles} fotos permitidas` });
    }

    const results = await Promise.all(
      files.map(async (file, index) => {
        const result = await cloudinaryService.uploadOptimized(
          file.buffer,
          file.filename,
          {
            preset: 'IMAGES',
            folder: `bitacoras/${bitacoraId}`,
            tags: ['bitacora', `tecnico_${tecnicoId}`, `bitacora_${bitacoraId}`],
            context: {
              bitacora_id: bitacoraId,
              tecnico_id: tecnicoId,
              subido_por: auth.clientType,
              orden: String(index + 1)
            },
            maxWidth: 1920,
            maxHeight: 1080
          }
        );

        return {
          url: result.secure_url,
          public_id: result.public_id,
          thumbnail: cloudinaryService.getTransformedUrl(result.public_id, {
            width: 300,
            height: 300,
            crop: 'thumb',
            quality: 'auto'
          }),
          original_filename: file.filename,
          bytes: result.bytes,
          format: result.format
        };
      })
    );

    return c.json({
      success: true,
      bitacora_id: bitacoraId,
      fotos: results,
      total: results.length
    });
  }
);

// Foto de rostro - App
router.post('/foto-rostro', 
  requirePermission('upload'),
  parseMultipart, 
  validateImage, 
  async (c) => {
    const files: FileUpload[] = c.get('files');
    const fields = c.get('fields');
    
    if (files.length !== 1) {
      throw new HTTPException(400, { message: 'Se requiere exactamente 1 foto' });
    }

    const file = files[0];
    const result = await cloudinaryService.uploadOptimized(
      file.buffer,
      file.filename,
      {
        preset: 'IMAGES',
        folder: `rostros/${fields.bitacora_id || 'temp'}`,
        maxWidth: 800,
        maxHeight: 800
      }
    );

    return c.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      thumbnail: cloudinaryService.getTransformedUrl(result.public_id, {
        width: 150,
        height: 150,
        crop: 'thumb',
        gravity: 'face'
      })
    });
  }
);

// Firma - App
router.post('/firma', 
  requirePermission('upload'),
  parseMultipart, 
  validateImage, 
  async (c) => {
    const files: FileUpload[] = c.get('files');
    const fields = c.get('fields');
    
    if (files.length !== 1) {
      throw new HTTPException(400, { message: 'Se requiere exactamente 1 firma' });
    }

    const file = files[0];
    
    if (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpeg') {
      throw new HTTPException(400, { message: 'La firma debe ser PNG o JPEG' });
    }

    const result = await cloudinaryService.uploadBuffer(
      file.buffer,
      file.filename,
      {
        preset: 'DOCS',
        folder: `firmas/${fields.bitacora_id || 'temp'}`
      }
    );

    return c.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id
    });
  }
);

// Documentos - Web
router.post('/documentos', 
  requirePermission('upload'),
  requireWeb,
  parseMultipart, 
  validateDocument, 
  async (c) => {
    const files: FileUpload[] = c.get('files');
    const fields = c.get('fields');
    
    const results = await Promise.all(
      files.map(async (file) => {
        const result = await cloudinaryService.uploadBuffer(
          file.buffer,
          file.filename,
          {
            preset: 'DOCS',
            folder: `documentos/${fields.beneficiario_id || 'general'}`
          }
        );

        return {
          url: result.secure_url,
          public_id: result.public_id,
          original_filename: file.filename,
          bytes: result.bytes
        };
      })
    );

    return c.json({
      success: true,
      documentos: results
    });
  }
);

// Ver fotos de bitácora - Web
router.get('/bitacora/:bitacoraId/fotos', 
  requirePermission('view'),
  requireWeb,
  async (c) => {
    const bitacoraId = c.req.param('bitacoraId');
    const result = await cloudinaryService.searchByTag(`bitacora_${bitacoraId}`);
    
    return c.json({
      success: true,
      bitacora_id: bitacoraId,
      fotos: result.resources.map((r: any) => ({
        url: r.secure_url,
        public_id: r.public_id,
        thumbnail: cloudinaryService.getTransformedUrl(r.public_id, {
          width: 300,
          height: 300,
          crop: 'thumb'
        }),
        created_at: r.created_at,
        bytes: r.bytes
      }))
    });
  }
);

// Transformar imagen - Web
router.get('/transform/:publicId', 
  requirePermission('transform'),
  requireWeb,
  async (c) => {
    const publicId = c.req.param('publicId');
    const { width, height, crop = 'limit' } = c.req.query();
    
    const url = cloudinaryService.getTransformedUrl(publicId, {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      crop: crop as any,
      quality: 'auto',
      format: 'auto'
    });

    return c.json({
      success: true,
      url,
      public_id: publicId
    });
  }
);

// Eliminar - Web
router.delete('/:publicId', 
  requirePermission('delete'),
  requireWeb,
  async (c) => {
    const publicId = c.req.param('publicId');
    await cloudinaryService.deleteFile(publicId);
    
    return c.json({
      success: true,
      message: 'Imagen eliminada',
      public_id: publicId
    });
  }
);

export default router;