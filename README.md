# Campo Files API

API REST para gestión de archivos e imágenes del sistema Campo. Permite subir, visualizar, transformar y eliminar archivos multimedia mediante integración con Cloudinary.

## Tabla de Contenidos

- [Información General](#información-general)
- [Autenticación y Autorización](#autenticación-y-autorización)
- [Health Checks](#health-checks)
- [Upload de Archivos](#upload-de-archivos)
- [Gestión de Archivos](#gestión-de-archivos)
- [Esquemas de Respuesta](#esquemas-de-respuesta)
- [Códigos de Error](#códigos-de-error)
- [Consideraciones de Seguridad](#consideraciones-de-seguridad)
- [Rate Limits](#rate-limits)
- [Flujo de Uso Representativo](#flujo-de-uso-representativo)
- [Deployment](#deployment)

---

## Información General

| Campo | Valor |
|-------|-------|
| **Título** | Campo Files API |
| **Versión** | 1.0.0 |
| **Framework** | Hono v4.12.11 |
| **Runtime** | Bun |
| **Puerto default** | 3000 |
| **Tipo de contenido** | `application/json` (excepto uploads que usan `multipart/form-data`) |

### URL Base

```
https://[dominio-deployed].railway.app
```

> **Nota:** Completar con la URL real de Railway una vez desplegado.

### Variables de Entorno Requeridas

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `PORT` | Puerto del servidor | No | `3000` |
| `API_KEY_WEB` | API Key para cliente web | Sí | - |
| `API_KEY_APP` | API Key para cliente móvil | Sí | - |
| `CLOUDINARY_CLOUD_NAME` | Nombre de la cuenta Cloudinary | Sí | - |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary | Sí | - |
| `CLOUDINARY_API_SECRET` | Secret de Cloudinary | Sí | - |
| `CLOUDINARY_PRESET_DOCS` | Upload preset para documentos | No | `campo_docs` |
| `CLOUDINARY_PRESET_IMAGENES` | Upload preset para imágenes | No | `campo_imagenes` |

---

## Autenticación y Autorización

### Mecanismo de Autenticación

La API utiliza **API Key** enviada en el header `X-API-Key`.

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | API Key (Bearer-style) |
| **Header** | `X-API-Key` |
| **Ubicación** | Header HTTP |
| **Ejemplo** | `X-API-Key: tu-api-key-aqui` |

### Tipos de Clientes

| Tipo | Descripción | Permisos |
|------|-------------|----------|
| `web` | Cliente web (panel administrativo) | `upload`, `view`, `delete`, `transform` |
| `app` | Cliente móvil | `upload` |

### Middleware de Autenticación

#### `authenticate`

Verifica que la API Key sea válida y determina el tipo de cliente.

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `401` | `"API Key requerida"` | Header `X-API-Key` ausente |
| `401` | `"API Key inválida"` | API Key no reconocida |

#### `requirePermission(permissions[])`

Verifica que el cliente tenga los permisos necesarios.

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `403` | `"Permiso denegado"` | Cliente sin alguno de los permisos requeridos |

#### `requireWeb`

Restringe el endpoint solo para clientes web.

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `403` | `"Solo disponible para web"` | Cliente tipo `app` intentó acceder |

---

## Health Checks

### GET `/health`

Verificación básica del servicio.

**Autenticación:** No requerida (público)

**Respuesta exitosa (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-04-06T15:11:50.000Z"
}
```

**Esquema de respuesta:**
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["ok"],
      "description": "Estado del servicio"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Fecha y hora ISO 8601"
    }
  }
}
```

### GET `/health/ready`

Verificación de disponibilidad para recibir tráfico.

**Autenticación:** No requerida (público)

**Respuesta exitosa (200):**
```json
{
  "ready": true,
  "timestamp": "2026-04-06T15:11:50.000Z"
}
```

**Esquema de respuesta:**
```json
{
  "type": "object",
  "properties": {
    "ready": {
      "type": "boolean",
      "description": "Indica si el servicio está listo"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Fecha y hora ISO 8601"
    }
  }
}
```

---

## Upload de Archivos

### POST `/upload/fotos-campo`

Sube fotos de campo asociadas a una bitácora. Soporta múltiples imágenes.

**Autenticación:** Requiere API Key válida con permiso `upload`

**Headers:**
| Header | Valor | Requerido |
|--------|-------|-----------|
| `X-API-Key` | API key válida | Sí |
| `Content-Type` | `multipart/form-data` | Sí |

**Form Fields (obligatorios):**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `bitacora_id` | string | ID de la bitácora |
| `tecnico_id` | string | ID del técnico que toma las fotos |

**Form Fields (opcionales):**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `files` | File[] | Imágenes a subir (máximo 10 para app, 20 para web) |

**Validaciones:**
- `bitacora_id` y `tecnico_id` son obligatorios
- Máximo 20 archivos para clientes web, 10 para app
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- Tamaño máximo por archivo: 10MB
- Carpeta destino: `bitacoras/{bitacora_id}/`

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `400` | `"bitacora_id y tecnico_id son requeridos"` | Campos obligatorios faltantes |
| `400` | `"Máximo X fotos permitidas"` | Excedió el límite de archivos |
| `400` | `"Tipo no permitido: {mimetype}"` | Tipo MIME no válido |
| `401` | `"API Key requerida"` | Header faltante |
| `401` | `"API Key inválida"` | API Key no reconocida |
| `403` | `"Permiso denegado"` | Sin permiso `upload` |
| `413` | `"Archivo {nombre} excede el límite de 10MB"` | Archivo demasiado grande |

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "bitacora_id": "123",
  "fotos": [
    {
      "url": "https://res.cloudinary.com/djfer9a6i/image/upload/v1234567890/bitacoras/123/foto_abc123.jpg",
      "public_id": "bitacoras/123/foto_abc123",
      "thumbnail": "https://res.cloudinary.com/djfer9a6i/image/upload/w_150,h_150,c_limit,q_auto,f_auto/v1234567890/bitacoras/123/foto_abc123.jpg",
      "original_filename": "foto1.jpg",
      "bytes": 123456,
      "format": "jpg"
    }
  ],
  "total": 1
}
```

**Esquema de respuesta:**
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "bitacora_id": { "type": "string" },
    "fotos": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "public_id": { "type": "string" },
          "thumbnail": { "type": "string", "format": "uri" },
          "original_filename": { "type": "string" },
          "bytes": { "type": "integer", "minimum": 0 },
          "format": { "type": "string" }
        },
        "required": ["url", "public_id"]
      }
    },
    "total": { "type": "integer", "minimum": 0 }
  },
  "required": ["success", "bitacora_id", "fotos", "total"]
}
```

**Ejemplo curl:**
```bash
curl -X POST https://api.campo.com/upload/fotos-campo \
  -H "X-API-Key: tu-api-key-web" \
  -F "bitacora_id=123" \
  -F "tecnico_id=456" \
  -F "files=@foto1.jpg" \
  -F "files=@foto2.jpg"
```

**Ejemplo fetch:**
```javascript
const formData = new FormData();
formData.append('bitacora_id', '123');
formData.append('tecnico_id', '456');
formData.append('files', fileInput.files[0]);
formData.append('files', fileInput.files[1]);

const response = await fetch('/upload/fotos-campo', {
  method: 'POST',
  headers: { 'X-API-Key': 'tu-api-key-web' },
  body: formData
});
const data = await response.json();
```

---

### POST `/upload/foto-rostro`

Sube foto de rostro para identificación del técnico. **Solo disponible para clientes app.**

**Autenticación:** Requiere API Key válida con permiso `upload` (tipo `app`)

**Headers:**
| Header | Valor | Requerido |
|--------|-------|-----------|
| `X-API-Key` | API key de tipo app | Sí |
| `Content-Type` | `multipart/form-data` | Sí |

**Form Fields (opcionales):**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `bitacora_id` | string | ID de bitácora (usa `'temp'` si no se provee) |
| `files` | File | Exactly 1 archivo de imagen |

**Validaciones:**
- Exactly 1 archivo requerido
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- Tamaño máximo: 10MB
- Se redimensiona a máximo 800x800px
- Carpeta destino: `rostros/{bitacora_id}/`

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `400` | `"Se requiere exactamente 1 foto"` | No se envió archivo o se enviaron múltiples |
| `400` | `"Tipo no permitido: {mimetype}"` | Tipo MIME no válido |
| `401` | `"API Key requerida"` | Header faltante |
| `401` | `"API Key inválida"` | API Key no reconocida |
| `403` | `"Solo disponible para web"` | Cliente web intentó acceder |
| `413` | `"Archivo excede el límite de 10MB"` | Archivo demasiado grande |

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/djfer9a6i/image/upload/v1234567890/rostros/temp/rostro_xyz123.jpg",
  "public_id": "rostros/temp/rostro_xyz123",
  "thumbnail": "https://res.cloudinary.com/djfer9a6i/image/upload/w_150,h_150,c_limit,q_auto,f_auto/v1234567890/rostros/temp/rostro_xyz123.jpg"
}
```

**Esquema de respuesta:**
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "url": { "type": "string", "format": "uri" },
    "public_id": { "type": "string" },
    "thumbnail": { "type": "string", "format": "uri" }
  },
  "required": ["success", "url", "public_id"]
}
```

**Ejemplo curl:**
```bash
curl -X POST https://api.campo.com/upload/foto-rostro \
  -H "X-API-Key: tu-api-key-app" \
  -F "bitacora_id=789" \
  -F "files=@rostro.jpg"
```

---

### POST `/upload/firma`

Sube firma del beneficiario. **Solo disponible para clientes app.**

**Autenticación:** Requiere API Key válida con permiso `upload` (tipo `app`)

**Headers:**
| Header | Valor | Requerido |
|--------|-------|-----------|
| `X-API-Key` | API key de tipo app | Sí |
| `Content-Type` | `multipart/form-data` | Sí |

**Form Fields (opcionales):**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `bitacora_id` | string | ID de bitácora (usa `'temp'` si no se provee) |
| `files` | File | Exactly 1 archivo (PNG o JPEG) |

**Validaciones:**
- Exactly 1 archivo requerido
- Solo PNG o JPEG permitidos
- Tamaño máximo: 10MB
- Carpeta destino: `firmas/{bitacora_id}/`

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `400` | `"Se requiere exactamente 1 firma"` | No se envió archivo o se enviaron múltiples |
| `400` | `"La firma debe ser PNG o JPEG"` | Formato no válido |
| `401` | `"API Key requerida"` | Header faltante |
| `401` | `"API Key inválida"` | API Key no reconocida |
| `403` | `"Solo disponible para web"` | Cliente web intentó acceder |
| `413` | `"Archivo excede el límite de 10MB"` | Archivo demasiado grande |

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/djfer9a6i/image/upload/v1234567890/firmas/temp/firma_abc123.png",
  "public_id": "firmas/temp/firma_abc123"
}
```

**Ejemplo curl:**
```bash
curl -X POST https://api.campo.com/upload/firma \
  -H "X-API-Key: tu-api-key-app" \
  -F "bitacora_id=789" \
  -F "files=@firma.png"
```

---

### POST `/upload/documentos`

Sube documentos de beneficiario (PDF, DOC, DOCX o imágenes). **Solo disponible para clientes web.**

**Autenticación:** Requiere API Key válida con permiso `upload` (tipo `web`)

**Headers:**
| Header | Valor | Requerido |
|--------|-------|-----------|
| `X-API-Key` | API key de tipo web | Sí |
| `Content-Type` | `multipart/form-data` | Sí |

**Form Fields (opcionales):**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `beneficiario_id` | string | ID del beneficiario (usa `'general'` si no se provee) |
| `files` | File[] | Archivos (PDF, DOC, DOCX, o imágenes) |

**Validaciones:**
- Solo clientes web permitidos
- Tipos permitidos: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/*`
- Tamaño máximo por archivo: 10MB
- Carpeta destino: `documentos/{beneficiario_id}/`

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `400` | `"Tipo no permitido: {mimetype}"` | Tipo MIME no válido |
| `401` | `"API Key requerida"` | Header faltante |
| `401` | `"API Key inválida"` | API Key no reconocida |
| `403` | `"Solo disponible para web"` | Cliente app intentó acceder |
| `413` | `"Archivo excede el límite de 10MB"` | Archivo demasiado grande |

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "documentos": [
    {
      "url": "https://res.cloudinary.com/djfer9a6i/image/upload/v1234567890/documentos/general/doc_xyz.pdf",
      "public_id": "documentos/general/doc_xyz",
      "original_filename": "documento_identidad.pdf",
      "bytes": 123456
    }
  ]
}
```

**Esquema de respuesta:**
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "documentos": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "public_id": { "type": "string" },
          "original_filename": { "type": "string" },
          "bytes": { "type": "integer", "minimum": 0 }
        },
        "required": ["url", "public_id"]
      }
    }
  },
  "required": ["success", "documentos"]
}
```

**Ejemplo curl:**
```bash
curl -X POST https://api.campo.com/upload/documentos \
  -H "X-API-Key: tu-api-key-web" \
  -F "beneficiario_id=456" \
  -F "files=@documento.pdf" \
  -F "files=@cedula.jpg"
```

---

## Gestión de Archivos

### GET `/upload/bitacora/:bitacoraId/fotos`

Obtiene todas las fotos de una bitácora. **Solo disponible para clientes web.**

**Autenticación:** Requiere API Key válida con permisos `view` (tipo `web`)

**Headers:**
| Header | Valor | Requerido |
|--------|-------|-----------|
| `X-API-Key` | API key de tipo web | Sí |

**Parámetros de ruta:**
| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `bitacoraId` | string | Sí | ID de la bitácora |

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `401` | `"API Key requerida"` | Header faltante |
| `401` | `"API Key inválida"` | API Key no reconocida |
| `403` | `"Solo disponible para web"` | Cliente app intentó acceder |
| `403` | `"Permiso denegado"` | Sin permiso `view` |

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "bitacora_id": "123",
  "fotos": [
    {
      "url": "https://res.cloudinary.com/djfer9a6i/image/upload/v1234567890/bitacoras/123/foto_abc123.jpg",
      "public_id": "bitacoras/123/foto_abc123",
      "thumbnail": "https://res.cloudinary.com/djfer9a6i/image/upload/w_150,h_150,c_limit,q_auto,f_auto/v1234567890/bitacoras/123/foto_abc123.jpg",
      "created_at": "2026-04-06T15:11:50.000Z",
      "bytes": 123456
    }
  ]
}
```

**Ejemplo curl:**
```bash
curl -X GET "https://api.campo.com/upload/bitacora/123/fotos" \
  -H "X-API-Key: tu-api-key-web"
```

---

### GET `/upload/transform/:publicId`

Genera URL transformada de una imagen existente. **Solo disponible para clientes web.**

**Autenticación:** Requiere API Key válida con permiso `transform` (tipo `web`)

**Headers:**
| Header | Valor | Requerido |
|--------|-------|-----------|
| `X-API-Key` | API key de tipo web | Sí |

**Parámetros de ruta:**
| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `publicId` | string | Sí | Public ID de Cloudinary (ej: `bitacoras/123/foto_abc`) |

**Parámetros de query:**
| Parámetro | Tipo | Obligatorio | Default | Descripción |
|-----------|------|-------------|---------|-------------|
| `width` | integer | No | - | Ancho de la imagen en pixels |
| `height` | integer | No | - | Alto de la imagen en pixels |
| `crop` | string | No | `'limit'` | Modo de recorte |

**Modos de `crop` disponibles:**
| Valor | Descripción |
|-------|-------------|
| `fill` | Rellena el área especificada, puede crop |
| `fit` | Ajusta la imagen al área sin distorsionar |
| `scale` | Escala proporcionalmente |
| `thumb` | Recorta al centro (bueno para avatares) |
| `limit` | Limita el tamaño sin agrandar |
| `pad` | Añade padding si es necesario |

**Validaciones:**
- `width` y `height` deben ser enteros válidos

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `400` | `"Parámetros inválidos"` | width/height no son enteros |
| `401` | `"API Key requerida"` | Header faltante |
| `401` | `"API Key inválida"` | API Key no reconocida |
| `403` | `"Solo disponible para web"` | Cliente app intentó acceder |
| `403` | `"Permiso denegado"` | Sin permiso `transform` |

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/djfer9a6i/image/upload/w_300,h_300,c_limit,q_auto,f_auto/v1234567890/bitacoras/123/foto_abc.jpg",
  "public_id": "bitacoras/123/foto_abc"
}
```

**Ejemplo curl:**
```bash
# Transformar a 300x300
curl -X GET "https://api.campo.com/upload/transform/bitacoras/123/foto_abc?width=300&height=300&crop=limit" \
  -H "X-API-Key: tu-api-key-web"

# Solo ancho
curl -X GET "https://api.campo.com/upload/transform/bitacoras/123/foto_abc?width=500" \
  -H "X-API-Key: tu-api-key-web"
```

---

### DELETE `/upload/:publicId`

Elimina una imagen de Cloudinary. **Solo disponible para clientes web.**

**Autenticación:** Requiere API Key válida con permiso `delete` (tipo `web`)

**Headers:**
| Header | Valor | Requerido |
|--------|-------|-----------|
| `X-API-Key` | API key de tipo web | Sí |

**Parámetros de ruta:**
| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `publicId` | string | Sí | Public ID de Cloudinary a eliminar |

**Validaciones:**
- `publicId` no debe contener caracteres especiales: `?&#\%<>=+`

**Errores:**
| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `400` | `"ID público inválido"` | Caracteres especiales detectados |
| `401` | `"API Key requerida"` | Header faltante |
| `401` | `"API Key inválida"` | API Key no reconocida |
| `403` | `"Solo disponible para web"` | Cliente app intentó acceder |
| `403` | `"Permiso denegado"` | Sin permiso `delete` |

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Imagen eliminada",
  "public_id": "bitacoras/123/foto_abc"
}
```

**Ejemplo curl:**
```bash
curl -X DELETE "https://api.campo.com/upload/bitacoras/123/foto_abc" \
  -H "X-API-Key: tu-api-key-web"
```

---

## Esquemas de Respuesta

### Respuesta Exitosa Estándar
```json
{
  "success": true,
  "data": {}
}
```

### Respuesta de Error Estándar
```json
{
  "success": false,
  "error": "Mensaje descriptivo del error"
}
```

### Esquema de Archivo Subido
```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "format": "uri",
      "description": "URL pública del archivo en Cloudinary"
    },
    "public_id": {
      "type": "string",
      "description": "Identificador único del recurso en Cloudinary"
    },
    "thumbnail": {
      "type": "string",
      "format": "uri",
      "description": "URL de miniatura redimensionada (solo imágenes)"
    },
    "original_filename": {
      "type": "string",
      "description": "Nombre original del archivo"
    },
    "bytes": {
      "type": "integer",
      "minimum": 0,
      "description": "Tamaño del archivo en bytes"
    },
    "format": {
      "type": "string",
      "description": "Formato del archivo (jpg, png, pdf, etc.)"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "Fecha de creación ISO 8601"
    }
  },
  "required": ["url", "public_id"]
}
```

---

## Códigos de Error

| Código | Nombre | Descripción | Causas comunes |
|--------|--------|-------------|---------------|
| `200` | OK | Solicitud exitosa | Endpoint respondeu correctamente |
| `400` | Bad Request | Parámetros inválidos | Falta de campos obligatorios, tipo MIME no permitido, límite de archivos excedido |
| `401` | Unauthorized | Autenticación fallida | API Key faltante o inválida |
| `403` | Forbidden | Autorización fallida | Permisos insuficientes, acceso restringido a tipo de cliente |
| `413` | Payload Too Large | Archivo muy grande | Archivo excede el límite de 10MB |
| `500` | Internal Server Error | Error del servidor | Error no manejado o excepción |

### Mensajes de Error Comunes

| Mensaje | Código | Significado |
|---------|--------|-------------|
| `"API Key requerida"` | 401 | Header `X-API-Key` no presente |
| `"API Key inválida"` | 401 | API Key no registrada en el sistema |
| `"Permiso denegado"` | 403 | Cliente sin los permisos requeridos |
| `"Solo disponible para web"` | 403 | Endpoint restringido a clientes web |
| `"bitacora_id y tecnico_id son requeridos"` | 400 | Campos obligatorios faltantes |
| `"Máximo X fotos permitidas"` | 400 | Se superó el límite de archivos por solicitud |
| `"Tipo no permitido: {mimetype}"` | 400 | Formato de archivo no soportado |
| `"Archivo {nombre} excede el límite de 10MB"` | 413 | Archivo demasiado grande |
| `"Error interno del servidor"` | 500 | Error no manejado en el servidor |

---

## Consideraciones de Seguridad

### Configuración CORS

La API tiene CORS habilitado globalmente para todos los orígenes:

```typescript
app.use('*', cors());
```

> **Advertencia:** Esta configuración permite solicitudes desde cualquier origen. Para producción, se recomienda restrictivamente configurar los orígenes permitidos.

### Recomendaciones

1. **No exponer API Keys en código cliente**
   - Usar variables de entorno
   - Implementar rotación de claves periódicamente

2. **Validación de archivos**
   - Validar tipo MIME en cliente y servidor
   - Limitar tamaño de archivos (10MB máximo)
   - Escanear archivos en busca de malware (implementar a nivel de Cloudinary)

3. **Protección de recursos**
   - Usar URLs firmadas con expiración para recursos sensibles
   - Implementar signed cookies en Cloudinary para acceso privado

4. **Rate limiting**
   - Implementar a nivel de API Gateway o servidor
   - Considerar límites por API Key

5. **Logs y auditoría**
   - Los logs de acceso están habilitados vía middleware `logger()`
   - No almacenar datos sensibles en logs

6. **HTTPS**
   - Asegurar que el tráfico sea solo HTTPS en producción

---

## Rate Limits

Actualmente **no hay rate limits implementados** a nivel de API. Se recomienda implementar a nivel de:

- API Gateway (Railway puede agregar nginx/limiter)
- Cloudflare o similar
- Custom middleware en la aplicación

### Recomendaciones de Rate Limits

| Endpoint | Límite sugerido | Ventana |
|----------|-----------------|---------|
| POST `/upload/*` | 100 requests | por minuto |
| GET `/upload/*` | 300 requests | por minuto |
| DELETE `/upload/*` | 50 requests | por minuto |
| GET `/health/*` | Sin límite | - |

---

## Flujo de Uso Representativo

### Flujo Completo: Crear, Leer, Actualizar (Transformar), Eliminar

#### Paso 1: Health Check
```bash
curl -X GET "https://api.campo.com/health/ready"
```
**Respuesta:**
```json
{"ready": true, "timestamp": "2026-04-06T21:00:00.000Z"}
```

#### Paso 2: Subir fotos de campo (Create)
```bash
curl -X POST "https://api.campo.com/upload/fotos-campo" \
  -H "X-API-Key: tu-api-key-web" \
  -F "bitacora_id=12345" \
  -F "tecnico_id=67890" \
  -F "files=@foto_campo_1.jpg" \
  -F "files=@foto_campo_2.jpg"
```
**Respuesta:**
```json
{
  "success": true,
  "bitacora_id": "12345",
  "fotos": [
    {
      "url": "https://res.cloudinary.com/.../bitacoras/12345/foto_abc.jpg",
      "public_id": "bitacoras/12345/foto_abc",
      "thumbnail": "https://res.cloudinary.com/.../bitacoras/12345/foto_abc.jpg?w_150...",
      "original_filename": "foto_campo_1.jpg",
      "bytes": 245678,
      "format": "jpg"
    },
    {
      "url": "https://res.cloudinary.com/.../bitacoras/12345/foto_def.jpg",
      "public_id": "bitacoras/12345/foto_def",
      "thumbnail": "https://res.cloudinary.com/.../bitacoras/12345/foto_def.jpg?w_150...",
      "original_filename": "foto_campo_2.jpg",
      "bytes": 312456,
      "format": "jpg"
    }
  ],
  "total": 2
}
```

#### Paso 3: Listar fotos de bitácora (Read)
```bash
curl -X GET "https://api.campo.com/upload/bitacora/12345/fotos" \
  -H "X-API-Key: tu-api-key-web"
```
**Respuesta:**
```json
{
  "success": true,
  "bitacora_id": "12345",
  "fotos": [
    {
      "url": "https://res.cloudinary.com/.../bitacoras/12345/foto_abc.jpg",
      "public_id": "bitacoras/12345/foto_abc",
      "thumbnail": "https://res.cloudinary.com/.../bitacoras/12345/foto_abc.jpg?w_150...",
      "created_at": "2026-04-06T21:00:00.000Z",
      "bytes": 245678
    },
    {
      "url": "https://res.cloudinary.com/.../bitacoras/12345/foto_def.jpg",
      "public_id": "bitacoras/12345/foto_def",
      "thumbnail": "https://res.cloudinary.com/.../bitacoras/12345/foto_def.jpg?w_150...",
      "created_at": "2026-04-06T21:00:05.000Z",
      "bytes": 312456
    }
  ]
}
```

#### Paso 4: Transformar imagen (Update)
```bash
curl -X GET "https://api.campo.com/upload/transform/bitacoras/12345/foto_abc?width=400&height=400&crop=thumb" \
  -H "X-API-Key: tu-api-key-web"
```
**Respuesta:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../bitacoras/12345/foto_abc.jpg?w_400,h_400,c_thumb,q_auto,f_auto",
  "public_id": "bitacoras/12345/foto_abc"
}
```

#### Paso 5: Eliminar foto (Delete)
```bash
curl -X DELETE "https://api.campo.com/upload/bitacoras/12345/foto_def" \
  -H "X-API-Key: tu-api-key-web"
```
**Respuesta:**
```json
{
  "success": true,
  "message": "Imagen eliminada",
  "public_id": "bitacoras/12345/foto_def"
}
```

---

## Deployment

### Despliegue en Railway

1. **Configurar variables de entorno** en Railway:
   ```
   API_KEY_WEB=valor-seguro-web
   API_KEY_APP=valor-seguro-app
   CLOUDINARY_CLOUD_NAME=tu-cloud-name
   CLOUDINARY_API_KEY=tu-api-key
   CLOUDINARY_API_SECRET=tu-secret
   CLOUDINARY_PRESET_DOCS=campo_docs
   CLOUDINARY_PRESET_IMAGENES=campo_imagenes
   ```

2. **Desplegar** desde GitHub connected repository

3. **Verificar** con `GET /health/ready`

### Comandos locales

```bash
# Instalar dependencias
bun install

# Desarrollo con hot reload
bun run src/index.ts

# Build para producción
bun run build

# Ejecutar producción (después del build)
bun run dist/index.js
```

---

## Checklist de Endpoints

| # | Verbo | Ruta | Estado | Notas |
|---|-------|------|--------|-------|
| 1 | GET | `/health/` | ✅ | Documentado |
| 2 | GET | `/health/ready` | ✅ | Documentado |
| 3 | POST | `/upload/fotos-campo` | ✅ | Documentado |
| 4 | POST | `/upload/foto-rostro` | ✅ | Documentado |
| 5 | POST | `/upload/firma` | ✅ | Documentado |
| 6 | POST | `/upload/documentos` | ✅ | Documentado |
| 7 | GET | `/upload/bitacora/:bitacoraId/fotos` | ✅ | Documentado |
| 8 | GET | `/upload/transform/:publicId` | ✅ | Documentado |
| 9 | DELETE | `/upload/:publicId` | ✅ | Documentado |

### Checklist de Información

- [x] Verbo HTTP para cada endpoint
- [x] Ruta completa
- [x] Descripción del propósito
- [x] Parámetros de ruta
- [x] Parámetros de query
- [x] Headers requeridos
- [x] Schema del body
- [x] Validaciones
- [x] Ejemplos curl
- [x] Respuestas exitosas (200)
- [x] Respuestas de error (400, 401, 403, 413)
- [x] Esquemas JSON
- [x] Códigos de estado HTTP
- [x] Mecanismo de autenticación
- [x] Permisos requeridos
- [x] Rate limits
- [x] Consideraciones de seguridad
- [x] Flujo de uso representativo (CRUD)
- [x] Deployment instructions

---

*Documento generado automáticamente. Última actualización: 2026-04-06*
