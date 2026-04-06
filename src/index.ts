import app from './app';

const port = parseInt(process.env.PORT || '3000');

const server = Bun.serve({
  port,
  fetch: app.fetch
});

console.log(`🚀 Server running at http://localhost:${port}`);