import axios, { AxiosInstance } from 'axios';
import { AIGCPlatformAdapter } from './types';

export class JimengAdapter implements AIGCPlatformAdapter {
  name = 'jimeng';
  private client: AxiosInstance;

  constructor() {
    const apiKey = process.env.JIMENG_API_KEY;
    const baseURL = process.env.JIMENG_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

    if (!apiKey) {
      console.warn('[JimengAdapter] JIMENG_API_KEY 未配置，API 调用将失败');
    }

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 提交生成任务
   * Endpoint: POST /contents/generations/tasks
   * 火山引擎即梦是异步 API：提交后返回 id，需要后续轮询查询结果
   */
  async submitTask(content: string, type: 'image' | 'video'): Promise<{ platformTaskId: string }> {
    const videoModel = process.env.JIMENG_VIDEO_MODEL || 'doubao-seedance-1-5-pro-251215';
    const imageModel = process.env.JIMENG_IMAGE_MODEL || 'doubao-seedream-4-0-250828';
    const model = type === 'image' ? imageModel : videoModel;

    const endpoint = '/contents/generations/tasks';

    // content 数组：文生视频/图只传 text；图生视频传 text + image_url
    const contentArray: any[] = [
      { type: 'text', text: content }
    ];

    const payload: any = {
      model,
      content: contentArray,
      watermark: false,
    };

    if (type === 'video') {
      // 1.5 Pro 视频参数（按文档）
      payload.generate_audio = false;  // false = 无声视频，更便宜
      payload.ratio = '16:9';
      payload.duration = 5;            // 5秒，成本最低
      payload.resolution = '720p';     // 1.5 Pro 默认 720p
      // payload.draft = true;         // 调 Prompt 阶段可设为 true 省钱，确认后改 false
    }

    if (type === 'image') {
      // 图像参数（根据实际图像模型文档调整，以下为通用值）
      payload.size = '1024x1024';
      payload.quality = 'standard';
    }

    try {
      const response = await this.client.post(endpoint, payload);
      const taskId = response.data?.id;

      if (!taskId) {
        throw new Error(`即梦 API 未返回 id: ${JSON.stringify(response.data)}`);
      }

      console.log(`[JimengAdapter] 任务提交成功，id: ${taskId}, model: ${model}, type: ${type}`);
      return { platformTaskId: taskId };
    } catch (error: any) {
      console.error('[JimengAdapter] 提交任务失败:', error.response?.data || error.message);
      throw new Error(`即梦 API 调用失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 查询任务状态
   * Endpoint: GET /contents/generations/tasks/{id}
   * 火山引擎状态：queued → running → succeeded / failed / expired
   */
  async queryTask(platformTaskId: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    resultUrl?: string;
    errorMessage?: string;
  }> {
    try {
      const response = await this.client.get(`/contents/generations/tasks/${platformTaskId}`);
      const data = response.data;

      const status = data?.status;

      switch (status) {
        case 'succeeded':
          return {
            status: 'completed',
            resultUrl: data?.output?.video_url || data?.output?.image_url || data?.url,
          };
        case 'failed':
          return {
            status: 'failed',
            errorMessage: data?.error?.message || data?.message || '生成失败',
          };
        case 'expired':
          return {
            status: 'failed',
            errorMessage: '任务超时（超过48小时或自定义过期时间）',
          };
        case 'queued':
        case 'running':
        default:
          return { status: 'processing' };
      }
    } catch (error: any) {
      console.error('[JimengAdapter] 查询任务失败:', error.response?.data || error.message);
      return {
        status: 'failed',
        errorMessage: `查询失败: ${error.response?.data?.message || error.message}`,
      };
    }
  }
}
