import { AIGCPlatformAdapter } from './types';
import { VolcanoAdapter } from './volcano';
import { DreaminaAdapter } from './dreamina';

export function getPlatformAdapter(platformName: string): AIGCPlatformAdapter {
  switch (platformName) {
    case 'volcano':
      return new VolcanoAdapter();
    case 'dreamina':
      return new DreaminaAdapter();
    default:
      throw new Error(`不支持的平台: ${platformName}`);
  }
}
