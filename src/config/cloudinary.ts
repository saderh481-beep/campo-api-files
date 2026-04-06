import { v2 as cloudinary } from 'cloudinary';

const requiredEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variable de entorno ${envVar} no está definida`);
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const PRESETS = {
  DOCS: process.env.CLOUDINARY_PRESET_DOCS || 'campo_docs',
  IMAGES: process.env.CLOUDINARY_PRESET_IMAGENES || 'campo_imagenes'
} as const;

export default cloudinary;
