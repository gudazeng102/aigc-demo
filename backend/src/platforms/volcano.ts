import axios from 'axios';
import { AIGCPlatformAdapter } from './types';

/**
 * 火山引擎适配器
 *
 * 说明：
 * - 实际接口地址、请求体字段、响应体字段需以火山引擎官方文档为准。
 * - 当前实现使用通用 HTTP 模式 + 环境变量配置，便于替换为真实端点。
 */
export class VolcanoAdapter implements AIGCPlatformAdapter {
  name = 'volcano';

  private apiKey = process.env.VOLCANO_API_KEY || '';
  private baseUrl = process.env.VOLCANO_BASE_URL || '';
  private imageModel = process.env.VOLCANO_IMAGE_MODEL || '';
  private videoModel = process.env.VOLCANO_VIDEO_MODEL || '';

  async submitTask(content: string, type: 'image' | 'video') {
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      throw new Error('VOLCANO_API_KEY 未配置');
    }
    if (!this.baseUrl) {
      throw new Error('VOLCANO_BASE_URL 未配置');
    }

    const model = type === 'video' ? this.videoModel : this.imageModel;
    if (!model) {
      throw new Error(`VOLCANO_${type.toUpperCase()}_MODEL 未配置`);
    }

    // TODO: 根据火山引擎官方文档替换为真实提交端点
    const endpoint =
      type === 'video'
        ? `${this.baseUrl}/api/v1/aigc/video/submit`
        : `${this.baseUrl}/api/v1/aigc/image/submit`;

    const response = await axios.post(
      endpoint,
      {
        model,
        prompt: content
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // TODO: 根据真实响应结构提取 platformTaskId
    const platformTaskId =
      response.data?.task_id ||
      response.data?.id ||
      response.data?.data?.task_id;

    if (!platformTaskId) {
      throw new Error('平台未返回任务 ID');
    }

    return { platformTaskId: String(platformTaskId) };
  }

  async queryTask(platformTaskId: string) {
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      throw new Error('VOLCANO_API_KEY 未配置');
    }

    // TODO: 根据火山引擎官方文档替换为真实查询端点
    const endpoint = `${this.baseUrl}/api/v1/aigc/task/${platformTaskId}`;

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      },
      timeout: 30000
    });

    const rawStatus =
      response.data?.status ||
      response.data?.data?.status ||
      '';

    const statusMap: Record<string, 'processing' | 'completed' | 'failed'> = {
      pending: 'processing',
      running: 'processing',
      processing: 'processing',
      success: 'completed',
      completed: 'completed',
      failed: 'failed',
      error: 'failed'
    };

    const status = statusMap[String(rawStatus).toLowerCase()] || 'processing';

    const resultUrl =
      response.data?.result_url ||
      response.data?.data?.result_url ||
      response.data?.url ||
      response.data?.data?.url;

    const errorMessage =
      response.data?.error_message ||
      response.data?.data?.error_message ||
      response.data?.error ||
      response.data?.data?.error;

    return { status, resultUrl, errorMessage };
  }
}
