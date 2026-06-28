import { AIGCPlatformAdapter } from './types';
import { JimengAdapter } from './jimeng';

export function getPlatformAdapter(platformName: string): AIGCPlatformAdapter {
  switch (platformName) {
    case 'jimeng':
      return new JimengAdapter();
    default:
      throw new Error(`不支持的平台: ${platformName}`);
  }
}
