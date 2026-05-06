import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrate: {
    async adapter() {
      const { PrismaNeon } = await import('@prisma/adapter-neon');
      const { neonConfig, Pool } = await import('@neondatabase/serverless');
      neonConfig.webSocketConstructor = (await import('ws')).default;
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      return new PrismaNeon(pool);
    },
  },
});
