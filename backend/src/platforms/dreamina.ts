import { AIGCPlatformAdapter } from './types';

/**
 * 即梦适配器（预留框架）
 *
 * 说明：
 * - 已实现 AIGCPlatformAdapter 接口，但具体 API 调用逻辑需要参考即梦官方文档补充。
 * - 当前调用会直接抛出错误，提示开发者接入真实接口。
 */
export class DreaminaAdapter implements AIGCPlatformAdapter {
  name = 'dreamina';

  async submitTask(_content: string, _type: 'image' | 'video'): Promise<{
    platformTaskId: string;
  }> {
    throw new Error('即梦适配器尚未实现，请补充 API 调用逻辑');
  }

  async queryTask(_platformTaskId: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    resultUrl?: string;
    errorMessage?: string;
  }> {
    throw new Error('即梦适配器尚未实现，请补充 API 调用逻辑');
  }
}
