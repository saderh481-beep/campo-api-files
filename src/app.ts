import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';

import uploadRoutes from './routes/upload.routes';
import healthRoutes from './routes/health.routes';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.route('/health', healthRoutes);
app.route('/upload', uploadRoutes);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  
  console.error('Error:', err);
  return c.json({ 
    success: false, 
    error: 'Error interno del servidor'
  }, 500);
});

export default app;