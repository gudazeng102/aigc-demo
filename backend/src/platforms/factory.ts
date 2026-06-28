import { AIGCPlatformAdapter } from './types';
import { JimengAdapter } from './jimeng';
import { VolcanoAdapter } from './volcano';
import { DreaminaAdapter } from './dreamina';

export function getPlatformAdapter(platformName: string): AIGCPlatformAdapter {
  switch (platformName) {
    case 'jimeng':
      return new JimengAdapter();
    case 'volcano':
      return new VolcanoAdapter();
    case 'dreamina':
      return new DreaminaAdapter();
    default:
      throw new Error(`不支持的平台: ${platformName}`);
  }
}
