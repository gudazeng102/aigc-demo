import axios, { AxiosInstance } from 'axios';
import { AIGCPlatformAdapter } from './types';

/**
 * 即梦适配器（火山引擎方舟）
 * 支持：
 * - 图像生成：同步接口 POST /images/generations，fake task ID 兼容轮询架构
 * - 视频生成：异步接口 POST /contents/generations/tasks，需轮询
 */
export class JimengAdapter implements AIGCPlatformAdapter {
  name = 'jimeng';
  private client: AxiosInstance;
  // 图像 fake task 结果暂存（内存级，后端重启丢失，可接受）
  private imageResults: Record<string, string> = {};

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
   * 根据 type 分支到图像同步接口或视频异步接口
   */
  async submitTask(
    content: string,
    type: 'image' | 'video',
    options?: {
      model?: string;
      resolution?: string;
      ratio?: string;
      duration?: number;
      imageUrl?: string;
      endImageUrl?: string;
      generateAudio?: boolean;
      draft?: boolean;
    }
  ): Promise<{ platformTaskId: string }> {
    if (type === 'image') {
      return this.submitImageTask(content, options);
    } else {
      return this.submitVideoTask(content, options);
    }
  }

  /**
   * 图像生成：同步接口
   * Endpoint: POST /images/generations
   */
  private async submitImageTask(
    content: string,
    options?: { model?: string; resolution?: string; imageUrl?: string }
  ): Promise<{ platformTaskId: string }> {
    const model = options?.model || process.env.JIMENG_IMAGE_MODEL || 'doubao-seedream-4-5-251128';

    // 分辨率映射：前端 1K/2K/4K → API size 字段
    const payload: any = {
      model,
      prompt: content,
      watermark: false,
      n: 1, // 固定1张
    };

    // 注：当前图像模型 doubao-seedream-4-5 不接受 size 参数，传了会报 400，
    // 因此暂不传入 size。如需支持，需根据实际开通的图像模型调整。

    // 参考图（图生图）
    // 火山引擎图像生成若支持 content 数组，则传入 image_url；
    // 若不支持，可改为 payload.reference_image = options.imageUrl
    if (options?.imageUrl) {
      payload.content = [
        { type: 'text', text: content },
        { type: 'image_url', image_url: { url: options.imageUrl } }
      ];
    }

    try {
      const response = await this.client.post('/images/generations', payload);
      const imageUrl = response.data?.data?.[0]?.url;

      if (!imageUrl) {
        throw new Error(`图像生成未返回 URL: ${JSON.stringify(response.data)}`);
      }

      // 生成 fake task ID，暂存结果 URL
      const fakeTaskId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      this.imageResults[fakeTaskId] = imageUrl;

      console.log(`[JimengAdapter] 图像生成成功，fakeTaskId: ${fakeTaskId}`);
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
  private async submitVideoTask(
    content: string,
    options?: {
      model?: string;
      resolution?: string;
      ratio?: string;
      duration?: number;
      imageUrl?: string;
      endImageUrl?: string;
      generateAudio?: boolean;
      draft?: boolean;
    }
  ): Promise<{ platformTaskId: string }> {
    // 确定模型ID
    const videoModelFast = process.env.JIMENG_VIDEO_MODEL_FAST || 'doubao-seedance-1-0-pro-fast-251015';
    const videoModelPro = process.env.JIMENG_VIDEO_MODEL_PRO || 'doubao-seedance-1-5-pro-251215';
    const isPro = options?.model?.includes('1-5-pro') || false;
    const model = options?.model || (isPro ? videoModelPro : videoModelFast);

    // 构造 content 数组
    const contentArray: any[] = [];

    // 1. 文本提示词
    contentArray.push({ type: 'text', text: content });

    // 2. 参考图（首帧）- 两者都支持
    if (options?.imageUrl) {
      contentArray.push({
        type: 'image_url',
        image_url: { url: options.imageUrl }
      });
    }

    // 3. 尾帧图 - 仅 Pro 支持
    if (isPro && options?.endImageUrl) {
      contentArray.push({
        type: 'image_url',
        image_url: { url: options.endImageUrl }
      });
    }

    const payload: any = {
      model,
      content: contentArray,
      watermark: false,
    };

    // 通用视频参数
    payload.resolution = options?.resolution || '720p';
    payload.ratio = options?.ratio || (isPro ? 'adaptive' : '16:9');
    payload.duration = options?.duration || 5;

    // Pro 专属参数
    if (isPro) {
      if (options?.generateAudio !== undefined) {
        payload.generate_audio = options.generateAudio;
      }
      if (options?.draft) {
        payload.draft = true;
        // draft 模式下强制 480p，且不支持 return_last_frame
        payload.resolution = '480p';
      }
    }

    try {
      const response = await this.client.post('/contents/generations/tasks', payload);
      const taskId = response.data?.id;

      if (!taskId) {
        throw new Error(`视频生成未返回任务 id: ${JSON.stringify(response.data)}`);
      }

      console.log(`[JimengAdapter] 视频任务提交成功，id: ${taskId}, model: ${model}`);
      return { platformTaskId: String(taskId) };
    } catch (error: any) {
      console.error('[JimengAdapter] 视频任务提交失败:', error.response?.data || error.message);
      throw new Error(`视频生成失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 查询任务状态
   * - img-xxx: 图像 fake task，直接返回 completed + 暂存 URL
   * - cgt-xxx: 视频真实 task，调用火山引擎查询接口
   */
  async queryTask(platformTaskId: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    resultUrl?: string;
    errorMessage?: string;
  }> {
    // 图像 fake task
    if (platformTaskId.startsWith('img-')) {
      const resultUrl = this.imageResults[platformTaskId];
      if (resultUrl) {
        console.log(`[JimengAdapter] 图像 fake task 返回 completed: ${platformTaskId}`);
        return { status: 'completed', resultUrl };
      } else {
        return { status: 'failed', errorMessage: '图像结果暂存已过期' };
      }
    }

    // 视频真实 task
    try {
      const response = await this.client.get(`/contents/generations/tasks/${platformTaskId}`);
      const data = response.data;

      console.log('[JimengAdapter] 视频查询返回:', JSON.stringify(data, null, 2));

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
      console.error('[JimengAdapter] 视频查询失败:', error.response?.data || error.message);
      return {
        status: 'failed',
        errorMessage: `查询失败: ${error.response?.data?.message || error.message}`,
      };
    }
  }
}
