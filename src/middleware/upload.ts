import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { FileUpload } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export const parseMultipart = async (c: Context, next: Next) => {
  const contentType = c.req.header('content-type') || '';
  
  if (!contentType.includes('multipart/form-data')) {
    throw new HTTPException(400, { message: 'Content-Type debe ser multipart/form-data' });
  }

  try {
    const body = await c.req.parseBody({ all: true });
    const files: FileUpload[] = [];
    const fields: Record<string, string> = {};

    for (const [key, value] of Object.entries(body)) {
      if (value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        if (buffer.length > MAX_FILE_SIZE) {
          throw new HTTPException(413, { 
            message: `Archivo ${value.name} excede el límite de 10MB` 
          });
        }

        files.push({
          buffer,
          filename: value.name,
          mimetype: value.type,
          size: buffer.length,
          fieldname: key
        });
      } else if (typeof value === 'string') {
        fields[key] = value;
      }
    }

    c.set('files', files);
    c.set('fields', fields);
    await next();
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(400, { message: 'Error procesando archivos' });
  }
};

export const validateImage = (c: Context, next: Next) => {
  const files: FileUpload[] = c.get('files') || [];
  
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new HTTPException(400, { 
        message: `Tipo no permitido: ${file.mimetype}` 
      });
    }
  }
  
  return next();
};

export const validateDocument = (c: Context, next: Next) => {
  const files: FileUpload[] = c.get('files') || [];
  
  for (const file of files) {
    if (!ALLOWED_DOC_TYPES.includes(file.mimetype) && !file.mimetype.startsWith('image/')) {
      throw new HTTPException(400, { message: `Tipo no permitido: ${file.mimetype}` });
    }
  }
  
  return next();
};