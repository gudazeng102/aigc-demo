import axios, { AxiosInstance } from 'axios';
import { AIGCPlatformAdapter } from './types';

/**
 * 即梦适配器（火山引擎方舟）
 * 支持：
 * - 视频生成：异步接口 POST /contents/generations/tasks，需轮询
 * - 图像生成：同步接口 POST /images/generations，直接返回结果
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
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 提交生成任务
   * 根据 type 分支：
   * - video: 异步接口，返回真实 task_id
   * - image: 同步接口，直接生成图片，返回 fake task_id（兼容轮询架构）
   */
  async submitTask(content: string, type: 'image' | 'video'): Promise<{ platformTaskId: string }> {
    if (type === 'image') {
      return this.submitImageTask(content);
    } else {
      return this.submitVideoTask(content);
    }
  }

  /**
   * 图像生成：同步接口
   * Endpoint: POST /images/generations
   */
  private async submitImageTask(content: string): Promise<{ platformTaskId: string }> {
    const model = process.env.JIMENG_IMAGE_MODEL || 'doubao-seedream-4-5-251128';

    const payload = {
      model,
      prompt: content,
      watermark: false,
      n: 1,              // 固定生成1张
    };

    try {
      const response = await this.client.post('/images/generations', payload);
      const imageUrl = response.data?.data?.[0]?.url;

      if (!imageUrl) {
        throw new Error(`图像生成未返回 URL: ${JSON.stringify(response.data)}`);
      }

      // 为了兼容现有异步任务架构（数据库需要 platform_task_id，前端有轮询逻辑），
      // 生成一个 fake task ID，并把图片 URL 暂存（通过类实例变量或 queryTask 时识别）
      const fakeTaskId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      // 使用类实例变量暂存 fake task 的结果 URL
      // 注意：如果后端重启，这些暂存会丢失，但 fake task 只存在于轮询期间，可接受
      (this as any).imageResults = (this as any).imageResults || {};
      (this as any).imageResults[fakeTaskId] = imageUrl;

      console.log(`[JimengAdapter] 图像生成成功，fakeTaskId: ${fakeTaskId}, url: ${imageUrl}`);
      return { platformTaskId: fakeTaskId };
    } catch (error: any) {
      console.error('[JimengAdapter] 图像生成失败:', error.response?.data || error.message);
      throw new Error(`图像生成失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 视频生成：异步接口
   * Endpoint: POST /contents/generations/tasks
   */
  private async submitVideoTask(content: string): Promise<{ platformTaskId: string }> {
    const model = process.env.JIMENG_VIDEO_MODEL || 'doubao-seedance-1-0-pro-fast-251015';

    const payload: any = {
      model,
      content: [{ type: 'text', text: content }],
      watermark: false,
      resolution: '720p',
      ratio: '16:9',
      duration: 5,
    };

    try {
      const response = await this.client.post('/contents/generations/tasks', payload);
      const taskId = response.data?.id;

      if (!taskId) {
        throw new Error(`视频生成未返回任务 id: ${JSON.stringify(response.data)}`);
      }

      console.log(`[JimengAdapter] 视频任务提交成功，id: ${taskId}`);
      return { platformTaskId: String(taskId) };
    } catch (error: any) {
      console.error('[JimengAdapter] 视频任务提交失败:', error.response?.data || error.message);
      throw new Error(`视频生成失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 查询任务状态
   * 根据 platformTaskId 前缀分支：
   * - img-xxx: 图像 fake task，直接返回 completed + 暂存的 URL
   * - cgt-xxx: 视频真实 task，调用火山引擎查询接口
   */
  async queryTask(platformTaskId: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    resultUrl?: string;
    errorMessage?: string;
  }> {
    // 图像 fake task：直接返回已完成
    if (platformTaskId.startsWith('img-')) {
      const imageResults = (this as any).imageResults || {};
      const resultUrl = imageResults[platformTaskId];

      if (resultUrl) {
        console.log(`[JimengAdapter] 图像 fake task 直接返回 completed: ${platformTaskId}`);
        return { status: 'completed', resultUrl };
      } else {
        // 如果后端重启导致暂存丢失，返回失败
        return { status: 'failed', errorMessage: '图像结果暂存已过期（后端可能已重启）' };
      }
    }

    // 视频真实 task：调用火山引擎查询接口
    try {
      const response = await this.client.get(`/contents/generations/tasks/${platformTaskId}`);
      const data = response.data;

      console.log('[JimengAdapter] 视频任务查询返回:', JSON.stringify(data, null, 2));

      const status = data?.status;

      switch (status) {
        case 'succeeded': {
          const possiblePaths = [
            data?.output?.video_url,
            data?.output?.image_url,
            data?.output?.url,
            data?.content?.video_url,
            data?.content?.image_url,
            data?.content?.url,
            data?.video_url,
            data?.image_url,
            data?.url,
            data?.data?.output?.video_url,
            data?.data?.output?.image_url,
            data?.data?.output?.url,
            data?.data?.content?.video_url,
            data?.data?.content?.image_url,
            data?.data?.content?.url,
            data?.data?.video_url,
            data?.data?.image_url,
            data?.data?.url,
            data?.result_url,
            data?.data?.result_url,
          ];

          let resultUrl = '';
          for (const url of possiblePaths) {
            if (url && typeof url === 'string' && url.startsWith('http')) {
              resultUrl = url;
              break;
            }
          }

          return { status: 'completed', resultUrl };
        }
        case 'failed':
          return {
            status: 'failed',
            errorMessage: data?.error?.message || data?.message || '生成失败',
          };
        case 'expired':
          return { status: 'failed', errorMessage: '任务超时' };
        case 'queued':
        case 'running':
        default:
          return { status: 'processing' };
      }
    } catch (error: any) {
      console.error('[JimengAdapter] 视频任务查询失败:', error.response?.data || error.message);
      return {
        status: 'failed',
        errorMessage: `查询失败: ${error.response?.data?.message || error.message}`,
      };
    }
  }
}
