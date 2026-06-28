import axios, { AxiosInstance } from 'axios';
import { AIGCPlatformAdapter } from './types';

/**
 * 即梦适配器（火山引擎方舟）
 * 基于火山引擎官方文档精确实现：
 * - 创建任务：POST /contents/generations/tasks
 * - 查询任务：GET /contents/generations/tasks/{id}
 * - 状态：queued → running → succeeded / failed / expired
 * - 模型：doubao-seedance-1-0-pro-fast-251015
 * 
 * 1.0 Pro Fast 限制：
 * - 不支持首尾帧、generate_audio、seed、camera_fixed、draft、priority
 * - 支持文生视频、图生视频-首帧
 * - duration 范围 [2, 12]，默认 5
 * - resolution 默认 1080p，支持 480p/720p/1080p
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
   * Endpoint: POST /contents/generations/tasks
   */
  async submitTask(content: string, type: 'image' | 'video'): Promise<{ platformTaskId: string }> {
    const videoModel = process.env.JIMENG_VIDEO_MODEL || 'doubao-seedance-1-0-pro-fast-251015';
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
      // 1.0 Pro Fast 视频参数（严格遵守文档限制）
      payload.resolution = '720p';    // 720p 比 1080p 便宜
      payload.ratio = '16:9';
      payload.duration = 5;           // 5秒，成本最低
      // 注意：1.0 Pro Fast 不支持以下参数，绝对不能传：
      // - generate_audio
      // - seed
      // - camera_fixed
      // - draft
      // - priority
    }

    if (type === 'image') {
      // 图像参数（根据实际图像模型文档调整）
      payload.size = '1024x1024';
      payload.quality = 'standard';
    }

    try {
      const response = await this.client.post('/contents/generations/tasks', payload);
      const taskId = response.data?.id;

      if (!taskId) {
        throw new Error(`即梦 API 未返回任务 id: ${JSON.stringify(response.data)}`);
      }

      console.log(`[JimengAdapter] 任务提交成功，id: ${taskId}, model: ${model}, type: ${type}`);
      return { platformTaskId: String(taskId) };
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

      // 强制打印完整返回（确保能排查问题）
      console.error('[JimengAdapter] 查询任务原始返回:', JSON.stringify(data, null, 2));

      const status = data?.status;

      // 状态映射：火山引擎 → 统一状态
      switch (status) {
        case 'succeeded': {
          // 地毯式搜索 resultUrl，覆盖所有可能的字段路径
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
              console.error('[JimengAdapter] 找到结果 URL:', resultUrl);
              break;
            }
          }

          if (!resultUrl) {
            console.error('[JimengAdapter] 警告: 状态为 succeeded 但未找到 resultUrl，完整返回:', JSON.stringify(data));
          }

          return { status: 'completed', resultUrl };
        }
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
