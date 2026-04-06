import { Hono } from 'hono';

const router = new Hono();

router.get('/', (c) => {
  return c.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

router.get('/ready', (c) => {
  return c.json({ 
    ready: true,
    timestamp: new Date().toISOString()
  });
});

export default router;
