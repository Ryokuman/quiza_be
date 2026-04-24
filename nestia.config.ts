import { INestiaConfig } from '@nestia/sdk';

const config: INestiaConfig = {
  input: 'src/**/*.controller.ts',
  output: '../client/src/api',
  clone: true,
  primitive: true,
  simulate: true,
};

export default config;
