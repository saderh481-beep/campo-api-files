# Campo Files API

API REST para gestión de archivos e imágenes del sistema Campo. Integración con Cloudinary.

## Requisitos

- [Bun](https://bun.sh) v1.2+

## Instalación

```bash
git clone <repo>
cd campo-api-files
bun install
```

## Configuración

Crear un archivo `.env` en la raíz:

```env
PORT=3000
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
CLOUDINARY_PRESET_DOCS=campo_docs
CLOUDINARY_PRESET_IMAGENES=campo_imagenes
API_KEY_WEB=clave_para_web
API_KEY_APP=clave_para_app
```

## Ejecución

```bash
# Desarrollo
bun src/index.ts

# Producción
bun run build
bun dist/index.js
```

## Documentación

Consulte [`docs/api.md`](docs/api.md) para la documentación completa de la API.
