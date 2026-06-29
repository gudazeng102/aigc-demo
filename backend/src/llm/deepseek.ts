import axios, { AxiosInstance } from 'axios';

/**
 * DeepSeek 适配器
 * 职责：
 * 1. 普通对话：直接返回自然语言回复
 * 2. 意图识别：解析用户生成需求，返回结构化 JSON 参数
 */
export class DeepSeekAdapter {
  private client: AxiosInstance;

  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

    if (!this.apiKey) {
      console.warn('[DeepSeekAdapter] DEEPSEEK_API_KEY 未配置，对话功能不可用');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 普通对话：直接返回自然语言回复
   */
  async chat(userMessage: string): Promise<string> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: userMessage }],
        temperature: 0.7,
      });

      return response.data?.choices?.[0]?.message?.content || '抱歉，我没有理解您的问题。';
    } catch (error: any) {
      console.error('[DeepSeekAdapter] 对话失败:', error.response?.data || error.message);
      throw new Error(`DeepSeek 对话失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 意图识别：解析用户生成需求，返回结构化参数
   * 必须使用 response_format: json_object 强制返回 JSON
   */
  async parseIntent(
    userMessage: string,
    mode: 'image' | 'video',
    currentParams?: Record<string, any>
  ): Promise<{
    intent: string;
    prompt: string;
    params: Record<string, any>;
  }> {
    const imagePrompt = `你是一个AIGC参数提取助手。用户正在使用图像生成工具。
请分析用户的自然语言描述，提取生成所需的参数，返回严格的JSON格式，不要有任何其他文字。

可用参数：
- prompt: 优化后的生成提示词（中文保持中文，不需要强行翻译）
- resolution: 1K / 2K / 4K（默认1K）
- ratio: 1:1 / 16:9 / 4:3 / 3:4 / 9:16（默认1:1）

用户输入：${userMessage}

请返回：
{
  "intent": "generate_image",
  "prompt": "优化后的提示词",
  "params": { "resolution": "...", "ratio": "..." }
}`;

    const videoPrompt = `你是一个AIGC参数提取助手。用户正在使用视频生成工具。
请分析用户的自然语言描述，提取生成所需的参数，返回严格的JSON格式，不要有任何其他文字。

可用参数：
- prompt: 优化后的生成提示词
- model: doubao-seedance-1-0-pro-fast-251015（Fast）或 doubao-seedance-1-5-pro-251215（Pro，默认Pro）
- resolution: 480p / 720p / 1080p（默认720p）
- ratio: 16:9 / 4:3 / 1:1 / 3:4 / 9:16 / 21:9 / adaptive（默认16:9）
- duration: 2-12的整数（默认5）
- generateAudio: true / false（默认false）
- draft: true / false（默认false）

注意：
- 如果用户提到"快速预览""草稿""样片"，draft设为true
- 如果用户提到"有声""带音频""带声音"，generateAudio设为true
- 如果用户提到"Fast""快速""便宜"，model设为Fast
- 如果用户提到"Pro""高质量""精细"，model设为Pro

用户输入：${userMessage}

请返回：
{
  "intent": "generate_video",
  "prompt": "优化后的提示词",
  "params": { "model": "...", "resolution": "...", "ratio": "...", "duration": 5, "generateAudio": false, "draft": false }
}`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: mode === 'image' ? imagePrompt : videoPrompt,
          },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('DeepSeek 返回内容为空');
      }

      const parsed = JSON.parse(content);
      return {
        intent: parsed.intent || `generate_${mode}`,
        prompt: parsed.prompt || userMessage,
        params: parsed.params || {},
      };
    } catch (error: any) {
      console.error('[DeepSeekAdapter] 意图识别失败:', error.response?.data || error.message);
      // 解析失败时，回退：用用户原文作为 prompt，其他参数用默认值
      return {
        intent: `generate_${mode}`,
        prompt: userMessage,
        params: currentParams || {},
      };
    }
  }
}