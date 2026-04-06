import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AuthContext, ClientType } from '../types';

const API_KEYS: Record<string, { type: ClientType; permissions: string[] }> = {
  [process.env.API_KEY_WEB!]: {
    type: 'web',
    permissions: ['upload', 'view', 'delete', 'transform']
  },
  [process.env.API_KEY_APP!]: {
    type: 'app',
    permissions: ['upload']
  }
};

export const authenticate = async (c: Context, next: Next) => {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey) {
    throw new HTTPException(401, { message: 'API Key requerida' });
  }

  const client = API_KEYS[apiKey];
  if (!client) {
    throw new HTTPException(401, { message: 'API Key inválida' });
  }

  c.set('auth', {
    clientType: client.type,
    permissions: client.permissions
  } as AuthContext);

  await next();
};

export const requirePermission = (...permissions: string[]) => {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext;
    
    const hasPermission = permissions.every(p => auth.permissions.includes(p));
    if (!hasPermission) {
      throw new HTTPException(403, { 
        message: `Permiso denegado` 
      });
    }
    
    await next();
  };
};

export const requireWeb = async (c: Context, next: Next) => {
  const auth = c.get('auth') as AuthContext;
  if (auth.clientType !== 'web') {
    throw new HTTPException(403, { message: 'Solo disponible para web' });
  }
  await next();
};