import axios, { AxiosInstance } from 'axios';
import { AIGCPlatformAdapter } from './types';

/**
 * 即梦适配器（火山引擎方舟）
 * 基于火山引擎官方文档实现：
 * - 创建任务：POST /contents/generations/tasks
 * - 查询任务：GET /contents/generations/tasks/{id}
 * - 状态：queued → running → succeeded / failed / expired
 */
export class JimengAdapter implements AIGCPlatformAdapter {
  name = 'jimeng';
  private client: AxiosInstance;

  constructor() {
    const apiKey = process.env.JIMENG_API_KEY || '';
    const baseURL = process.env.JIMENG_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

    if (!apiKey) {
      throw new Error('JIMENG_API_KEY 未配置，请检查 backend/.env');
    }

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async submitTask(content: string, type: 'image' | 'video') {
    const videoModel = process.env.JIMENG_VIDEO_MODEL || 'doubao-seedance-1-5-pro-251215';
    const imageModel = process.env.JIMENG_IMAGE_MODEL || '';
    const model = type === 'image' ? imageModel : videoModel;

    if (!model) {
      throw new Error(`JIMENG_${type.toUpperCase()}_MODEL 未配置`);
    }

    // content 必须按文档格式：数组，包含 type 字段
    const contentArray = [{ type: 'text' as const, text: content }];

    const payload: any = {
      model,
      content: contentArray,
      watermark: false,
    };

    if (type === 'video') {
      payload.generate_audio = false;  // 无声视频更便宜
      payload.ratio = '16:9';
      payload.duration = 5;
      payload.resolution = '720p';
    }

    if (type === 'image') {
      payload.size = '1024x1024';
      payload.quality = 'standard';
    }

    const response = await this.client.post('/contents/generations/tasks', payload);

    // 文档返回：{ "id": "cgt-2025******-****" }
    const platformTaskId = response.data?.id;

    if (!platformTaskId) {
      throw new Error(`即梦 API 未返回任务 id: ${JSON.stringify(response.data)}`);
    }

    console.log(`[JimengAdapter] 任务提交成功，id: ${platformTaskId}, type: ${type}`);
    return { platformTaskId: String(platformTaskId) };
  }

  async queryTask(platformTaskId: string) {
    const response = await this.client.get(`/contents/generations/tasks/${platformTaskId}`);
  console.log('[JimengAdapter] 查询任务原始返回:', JSON.stringify(response.data, null, 2));
    const status = response.data?.status;

    switch (status) {
      case 'succeeded':
        return {
          status: 'completed' as const,
          resultUrl: response.data?.output?.video_url || response.data?.output?.image_url || '',
        };
      case 'failed':
        return {
          status: 'failed' as const,
          errorMessage: response.data?.error?.message || response.data?.message || '生成失败',
        };
      case 'expired':
        return {
          status: 'failed' as const,
          errorMessage: '任务超时',
        };
      case 'queued':
      case 'running':
      default:
        return { status: 'processing' as const };
    }
  }
}
