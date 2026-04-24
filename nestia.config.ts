import { INestiaConfig } from '@nestia/sdk';

const config: INestiaConfig = {
  input: 'src/**/*.controller.ts',
  output: '../client/src/api',
  clone: true,
  primitive: true,
  simulate: true,
  swagger: {
    openapi: '3.1',
    output: 'dist/swagger.json',
    beautify: true,
    servers: [
      { url: 'http://localhost:8080', description: 'Local' },
    ],
  },
};

export default config;
