import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { FileUpload } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const IMAGE_MAGIC_BYTES: Record<string, [number, Uint8Array][]> = {
  'image/jpeg': [[0, new Uint8Array([0xFF, 0xD8, 0xFF])]],
  'image/png':  [[0, new Uint8Array([0x89, 0x50, 0x4E, 0x47])]],
  'image/webp': [[0, new Uint8Array([0x52, 0x49, 0x46, 0x46])]],
  'image/heic': [[4, new Uint8Array([0x66, 0x74, 0x79, 0x70])]],
};

function validateImageBuffer(buffer: Buffer, mimetype: string): void {
  if (buffer.length === 0) {
    throw new HTTPException(400, { message: 'Archivo vacío' });
  }

  const signatures = IMAGE_MAGIC_BYTES[mimetype];
  if (!signatures) return;

  for (const [offset, magic] of signatures) {
    if (buffer.length < offset + magic.length) {
      throw new HTTPException(400, { message: 'Archivo de imagen corrupto o incompleto' });
    }
    for (let i = 0; i < magic.length; i++) {
      if (buffer[offset + i] !== magic[i]) {
        throw new HTTPException(400, { message: 'Archivo de imagen corrupto o inválido' });
      }
    }
  }
}

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
      } else if (Array.isArray(value) && value[0] instanceof File) {
        for (const file of value) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          if (buffer.length > MAX_FILE_SIZE) {
            throw new HTTPException(413, { 
              message: `Archivo ${file.name} excede el límite de 10MB` 
            });
          }

          files.push({
            buffer,
            filename: file.name,
            mimetype: file.type,
            size: buffer.length,
            fieldname: key
          });
        }
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
    validateImageBuffer(file.buffer as Buffer, file.mimetype);
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