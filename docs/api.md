# Campo Files API — Documentación

API REST para subir, visualizar, transformar y eliminar archivos multimedia mediante Cloudinary.

- **Framework:** Hono v4
- **Runtime:** Bun
- **Puerto default:** `3000`
- **URL base:** `https://[dominio]/`

---

## Tabla de Contenidos

- [Autenticación](#autenticación)
- [Health](#health)
- [Upload de Archivos](#upload-de-archivos)
  - [POST /upload/fotos-campo](#post-uploadfotos-campo)
  - [POST /upload/foto-rostro](#post-uploadfoto-rostro)
  - [POST /upload/firma](#post-uploadfirma)
  - [POST /upload/documentos](#post-uploaddocumentos)
- [Gestión de Archivos](#gestión-de-archivos)
  - [GET /upload/bitacora/:bitacoraId/fotos](#get-uploadbitacorabitacoraidfotos)
  - [GET /upload/transform/:publicId](#get-uploadtransformpublicid)
  - [DELETE /upload/:publicId](#delete-uploadpublicid)
- [Códigos de Error](#códigos-de-error)
- [Esquemas](#esquemas)

---

## Autenticación

Toda la API (excepto `/health`) requiere una API Key en el header `X-API-Key`.

| Header | Valor | Requerido |
|--------|-------|-----------|
| `X-API-Key` | API key del cliente | Sí |

### Tipos de Cliente

| Tipo | Permisos | Descripción |
|------|----------|-------------|
| `web` | `upload`, `view`, `delete`, `transform` | Panel administrativo |
| `app` | `upload` | App móvil |

### Errores de Autenticación

| Código | Mensaje | Causa |
|--------|---------|-------|
| `401` | `"API Key requerida"` | Header `X-API-Key` ausente |
| `401` | `"API Key inválida"` | API Key no reconocida |
| `403` | `"Permiso denegado"` | Cliente sin permisos suficientes |
| `403` | `"Solo disponible para web"` | Cliente `app` intentó acceder a endpoint web |

---

## Health

### GET `/health`

```
GET /health
```

Verificación básica del servicio. **No requiere autenticación.**

**Respuesta 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-14T12:00:00.000Z"
}
```

### GET `/health/ready`

```
GET /health/ready
```

Verificación de disponibilidad. **No requiere autenticación.**

**Respuesta 200:**
```json
{
  "ready": true,
  "timestamp": "2026-05-14T12:00:00.000Z"
}
```

---

## Upload de Archivos

Todos los endpoints de upload usan `Content-Type: multipart/form-data`.

Reglas generales:
- Tamaño máximo por archivo: **10 MB**
- La API recibe archivos individuales o múltiples en un mismo campo
- Los archivos se procesan **secuencialmente** uno por uno para evitar corrupción
- Cada imagen se valida contra su firma (magic bytes) antes de subir:
  - JPEG: `\xFF\xD8\xFF`
  - PNG: `\x89PNG`
  - WebP: `RIFF`
  - HEIC: `ftyp`
- Si un archivo está vacío o tiene firma inválida, se rechaza con error `400

### POST `/upload/fotos-campo`

Sube fotos de campo asociadas a una bitácora. **Web y App.**

**Headers:**
| Header | Valor |
|--------|-------|
| `X-API-Key` | API key con permiso `upload` |
| `Content-Type` | `multipart/form-data` |

**Campos:**

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `bitacora_id` | string | Sí | ID de la bitácora |
| `tecnico_id` | string | Sí | ID del técnico |
| `file(s)` | File | No | Imágenes (máx. 10 app, 20 web) |

**Validaciones:**
- `bitacora_id` y `tecnico_id` obligatorios
- Máx. 10 archivos para app, 20 para web
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- Validación de integridad por magic bytes (JPEG, PNG, WebP, HEIC)
- Se redimensiona a máx. 1920x1080 con calidad automática
- Las imágenes se suben secuencialmente una por una
- Carpeta destino: `bitacoras/{bitacora_id}/`
- Metadatos guardados: `bitacora_id`, `tecnico_id`, `subido_por`, `orden`

**Respuesta 200:**
```json
{
  "success": true,
  "bitacora_id": "123",
  "fotos": [
    {
      "url": "https://res.cloudinary.com/.../bitacoras/123/foto.jpg",
      "public_id": "bitacoras/123/foto_abc",
      "thumbnail": "https://res.cloudinary.com/.../c_thumb,h_300,w_300/...",
      "original_filename": "foto1.jpg",
      "bytes": 123456,
      "format": "jpg"
    }
  ],
  "total": 1
}
```

**Ejemplo curl:**
```bash
curl -X POST https://api.campo.com/upload/fotos-campo \
  -H "X-API-Key: campo_app_key_2024" \
  -F "bitacora_id=123" \
  -F "tecnico_id=456" \
  -F "file=@foto1.jpg" \
  -F "file=@foto2.jpg"
```

---

### POST `/upload/foto-rostro`

Sube foto de rostro del técnico. **App.**

**Headers:**
| Header | Valor |
|--------|-------|
| `X-API-Key` | API key con permiso `upload` |
| `Content-Type` | `multipart/form-data` |

**Campos:**

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `bitacora_id` | string | No | ID de bitácora (default: `'temp'`) |
| `file` | File | Sí | Exactamente 1 imagen |

**Validaciones:**
- Exactamente 1 archivo requerido
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- Se redimensiona a máx. 800x800
- Thumbnail con detección de rostro (`gravity: 'face'`)
- Carpeta destino: `rostros/{bitacora_id}/`

**Respuesta 200:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../rostros/temp/rostro.jpg",
  "public_id": "rostros/temp/rostro_xyz",
  "thumbnail": "https://res.cloudinary.com/.../c_thumb,g_face,h_150,w_150/..."
}
```

**Ejemplo curl:**
```bash
curl -X POST https://api.campo.com/upload/foto-rostro \
  -H "X-API-Key: campo_app_key_2024" \
  -F "bitacora_id=789" \
  -F "file=@rostro.jpg"
```

---

### POST `/upload/firma`

Sube firma del beneficiario. **App.**

**Headers:**
| Header | Valor |
|--------|-------|
| `X-API-Key` | API key con permiso `upload` |
| `Content-Type` | `multipart/form-data` |

**Campos:**

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `bitacora_id` | string | No | ID de bitácora (default: `'temp'`) |
| `file` | File | Sí | Exactamente 1 imagen (PNG o JPEG) |

**Validaciones:**
- Exactamente 1 archivo requerido
- Solo `image/png` y `image/jpeg` permitidos
- Carpeta destino: `firmas/{bitacora_id}/`

**Respuesta 200:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../firmas/temp/firma.png",
  "public_id": "firmas/temp/firma_abc"
}
```

**Ejemplo curl:**
```bash
curl -X POST https://api.campo.com/upload/firma \
  -H "X-API-Key: campo_app_key_2024" \
  -F "bitacora_id=789" \
  -F "file=@firma.png"
```

---

### POST `/upload/documentos`

Sube documentos del beneficiario. **Solo web.**

**Headers:**
| Header | Valor |
|--------|-------|
| `X-API-Key` | API key de tipo `web` con permiso `upload` |
| `Content-Type` | `multipart/form-data` |

**Campos:**

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `beneficiario_id` | string | No | ID del beneficiario (default: `'general'`) |
| `file(s)` | File | No | Archivos (PDF, DOC, DOCX, imágenes) |

**Validaciones:**
- Solo clientes `web` permitidos
- Tipos permitidos: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/*`
- Carpeta destino: `documentos/{beneficiario_id}/`

**Respuesta 200:**
```json
{
  "success": true,
  "documentos": [
    {
      "url": "https://res.cloudinary.com/.../documentos/general/doc.pdf",
      "public_id": "documentos/general/doc_xyz",
      "original_filename": "documento.pdf",
      "bytes": 123456
    }
  ]
}
```

**Ejemplo curl:**
```bash
curl -X POST https://api.campo.com/upload/documentos \
  -H "X-API-Key: campo_web_key_2024" \
  -F "beneficiario_id=456" \
  -F "file=@documento.pdf"
```

---

## Gestión de Archivos

### GET `/upload/bitacora/:bitacoraId/fotos`

Lista las fotos de una bitácora. **Solo web.**

**Headers:**
| Header | Valor |
|--------|-------|
| `X-API-Key` | API key de tipo `web` con permiso `view` |

**Parámetros de ruta:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `bitacoraId` | string | ID de la bitácora |

**Respuesta 200:**
```json
{
  "success": true,
  "bitacora_id": "123",
  "fotos": [
    {
      "url": "https://res.cloudinary.com/.../bitacoras/123/foto.jpg",
      "public_id": "bitacoras/123/foto_abc",
      "thumbnail": "https://res.cloudinary.com/.../c_thumb,h_300,w_300/...",
      "created_at": "2026-05-14T12:00:00.000Z",
      "bytes": 123456
    }
  ]
}
```

**Ejemplo:**
```bash
curl -X GET "https://api.campo.com/upload/bitacora/123/fotos" \
  -H "X-API-Key: campo_web_key_2024"
```

---

### GET `/upload/transform/:publicId`

Genera URL transformada de una imagen. **Solo web.**

**Headers:**
| Header | Valor |
|--------|-------|
| `X-API-Key` | API key de tipo `web` con permiso `transform` |

**Parámetros de ruta:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `publicId` | string | Public ID de Cloudinary (ej: `bitacoras/123/foto_abc`) |

**Parámetros query:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `width` | integer | — | Ancho en píxeles |
| `height` | integer | — | Alto en píxeles |
| `crop` | string | `limit` | Modo de recorte |

**Modos de crop:**
| Valor | Descripción |
|-------|-------------|
| `fill` | Rellena el área, puede recortar |
| `fit` | Ajusta sin distorsionar |
| `scale` | Escala proporcionalmente |
| `thumb` | Recorta al centro (avatares) |
| `limit` | Limita sin agrandar |
| `pad` | Añade padding |

**Respuesta 200:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../w_300,h_300,c_limit,q_auto,f_auto/...",
  "public_id": "bitacoras/123/foto_abc"
}
```

**Ejemplo:**
```bash
curl -X GET "https://api.campo.com/upload/transform/bitacoras/123/foto_abc?width=300&height=300&crop=thumb" \
  -H "X-API-Key: campo_web_key_2024"
```

---

### DELETE `/upload/:publicId`

Elimina un archivo de Cloudinary. **Solo web.**

**Headers:**
| Header | Valor |
|--------|-------|
| `X-API-Key` | API key de tipo `web` con permiso `delete` |

**Parámetros de ruta:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `publicId` | string | Public ID a eliminar |

**Validaciones:**
- `publicId` no debe contener: `?&#\%<>=+`

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Imagen eliminada",
  "public_id": "bitacoras/123/foto_abc"
}
```

**Ejemplo:**
```bash
curl -X DELETE "https://api.campo.com/upload/bitacoras/123/foto_abc" \
  -H "X-API-Key: campo_web_key_2024"
```

---

## Códigos de Error

| Código | Significado | Causas comunes |
|--------|-------------|----------------|
| `200` | OK | Solicitud exitosa |
| `400` | Bad Request | Campos faltantes, tipo MIME no permitido, límite de archivos excedido |
| `401` | Unauthorized | API Key faltante o inválida |
| `403` | Forbidden | Permisos insuficientes, endpoint restringido a web |
| `413` | Payload Too Large | Archivo > 10 MB |
| `500` | Internal Server Error | Error no manejado |

### Mensajes de Error Comunes

| Mensaje | Código |
|---------|--------|
| `"API Key requerida"` | 401 |
| `"API Key inválida"` | 401 |
| `"Permiso denegado"` | 403 |
| `"Solo disponible para web"` | 403 |
| `"bitacora_id y tecnico_id son requeridos"` | 400 |
| `"Máximo X fotos permitidas"` | 400 |
| `"Se requiere exactamente 1 foto"` | 400 |
| `"Se requiere exactamente 1 firma"` | 400 |
| `"La firma debe ser PNG o JPEG"` | 400 |
| `"Tipo no permitido: {mimetype}"` | 400 |
| `"Archivo {nombre} excede el límite de 10MB"` | 413 |
| `"Archivo vacío"` | 400 |
| `"Archivo de imagen corrupto o incompleto"` | 400 |
| `"Archivo de imagen corrupto o inválido"` | 400 |
| `"Error procesando archivos"` | 400 |
| `"Error interno del servidor"` | 500 |

---

## Esquemas

### Respuesta Exitosa

```json
{
  "success": true,
  ...
}
```

### Respuesta de Error

```json
{
  "success": false,
  "error": "Mensaje descriptivo"
}
```

### Archivo Subido (campos comunes)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `url` | string (uri) | URL pública en Cloudinary |
| `public_id` | string | ID único del recurso en Cloudinary |
| `thumbnail` | string (uri) | URL de miniatura (solo imágenes) |
| `original_filename` | string | Nombre original del archivo |
| `bytes` | integer | Tamaño en bytes |
| `format` | string | Formato (jpg, png, pdf, etc.) |
| `created_at` | string (date-time) | Fecha de creación ISO 8601 |
