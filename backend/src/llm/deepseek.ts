import axios, { AxiosInstance } from 'axios';

/**
 * DeepSeek 适配器
 * 职责：
 * 1. 普通对话：直接返回自然语言回复
 * 2. 意图识别（多轮上下文版）：支持历史消息、参数继承、重新生成识别
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
   * 普通对话：直接返回自然语言回复（无历史）
   */
  async chat(userMessage: string): Promise<string> {
    return this.chatWithHistory(userMessage, []);
  }

  /**
   * 普通对话（带多轮上下文版本）
   */
  async chatWithHistory(
    userMessage: string,
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    try {
      const messages: Array<{ role: string; content: string }> = [];

      // 添加历史消息
      for (const h of history) {
        if (h.role === 'assistant' || h.role === 'user') {
          messages.push({ role: h.role, content: h.content });
        }
      }

      // 添加当前用户输入
      messages.push({ role: 'user', content: userMessage });

      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
      });

      return response.data?.choices?.[0]?.message?.content || '抱歉，我没有理解您的问题。';
    } catch (error: any) {
      console.error('[DeepSeekAdapter] 对话失败:', error.response?.data || error.message);
      throw new Error(`DeepSeek 对话失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 意图识别（多轮上下文版）
   * 支持传入历史消息、上一轮参数、重新生成标志
   * 重新生成时直接返回上一轮参数，不调 LLM
   */
  async parseIntent(
    userMessage: string,
    mode: 'image' | 'video',
    history: Array<{ role: string; content: string }>,
    currentParams?: Record<string, any>,
    isRegenerate?: boolean
  ): Promise<{
    intent: string;
    prompt: string;
    params: Record<string, any>;
  }> {
    // 如果是重新生成，直接复用上一轮参数，不调 LLM
    if (isRegenerate) {
      return {
        intent: `generate_${mode}`,
        prompt: userMessage,
        params: currentParams || {},
      };
    }

    const historyStr = history
      .map((h) => {
        const label = h.role === 'assistant' ? 'AI' : '用户';
        return `${label}：${h.content}`;
      })
      .join('\n');

    const currentParamsStr = JSON.stringify(currentParams || {});

    const imagePrompt = `你是一个AIGC参数提取助手。用户正在使用图像生成工具，支持多轮对话调整。

历史对话上下文（最近几轮）：
${historyStr || '（无历史）'}

上一轮使用的参数：${currentParamsStr}

用户当前输入：${userMessage}

请根据上下文理解用户意图：
- 如果是全新需求，返回完整的参数对象
- 如果是修改上一轮生成（如"改成横版的""加点咖啡杯""换成2K"），基于上一轮参数做局部调整，返回完整的参数对象（不要只返回修改的字段）
- 如果用户提到"重新生成""再来一张""再生成一次"，保持上一轮参数不变

可用参数：
- prompt: 优化后的生成提示词（中文保持中文，不需要强行翻译）
- resolution: 1K / 2K / 4K（默认1K）
- ratio: 1:1 / 16:9 / 4:3 / 3:4 / 9:16（默认1:1）

注意：
- 必须返回完整的 params 对象，包含所有参数字段
- 如果用户只提到修改某个参数（如"改成横版"），其他参数保持上一轮值不变
- 如果这是第一轮（没有上一轮参数），使用默认值

请返回严格的JSON格式，不要有任何其他文字：
{
  "intent": "generate_image",
  "prompt": "优化后的提示词",
  "params": { "resolution": "...", "ratio": "..." }
}`;

    const videoPrompt = `你是一个AIGC参数提取助手。用户正在使用视频生成工具，支持多轮对话调整。

历史对话上下文（最近几轮）：
${historyStr || '（无历史）'}

上一轮使用的参数：${currentParamsStr}

用户当前输入：${userMessage}

请根据上下文理解用户意图：
- 如果是全新需求，返回完整的参数对象
- 如果是修改上一轮生成（如"改成竖屏""加长到10秒""开启音频"），基于上一轮参数做局部调整，返回完整的参数对象
- 如果用户提到"重新生成""再来一段""再生成一次"，保持上一轮参数不变

可用参数：
- prompt: 优化后的生成提示词
- model: doubao-seedance-1-0-pro-fast-251015（Fast）或 doubao-seedance-1-5-pro-251215（Pro，默认Pro）
- resolution: 480p / 720p / 1080p（默认720p）
- ratio: 16:9 / 4:3 / 1:1 / 3:4 / 9:16 / 21:9 / adaptive（默认16:9）
- duration: 2-12的整数（默认5）
- generateAudio: true / false（默认false）
- draft: true / false（默认false）

注意：
- 必须返回完整的 params 对象，包含所有参数字段
- 如果用户只提到修改某个参数，其他参数保持上一轮值不变
- 如果提到"快速预览""草稿""样片"，draft设为true（强制480p）
- 如果提到"有声""带音频""带声音"，generateAudio设为true
- 如果提到"Fast""快速""便宜"，model设为Fast
- 如果提到"Pro""高质量""精细"，model设为Pro

请返回严格的JSON格式，不要有任何其他文字：
{
  "intent": "generate_video",
  "prompt": "优化后的提示词",
  "params": { "model": "...", "resolution": "...", "ratio": "...", "duration": 5, "generateAudio": false, "draft": false }
}`;

    try {
      const messages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: mode === 'image' ? imagePrompt : videoPrompt,
        },
      ];

      // 添加历史消息
      for (const h of history) {
        if (h.role === 'assistant' || h.role === 'user') {
          messages.push({ role: h.role, content: h.content });
        }
      }

      // 添加当前用户输入
      messages.push({ role: 'user', content: userMessage });

      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-chat',
        messages,
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
      // 回退：继承上一轮参数，只更新 prompt
      return {
        intent: `generate_${mode}`,
        prompt: userMessage,
        params: currentParams || {},
      };
    }
  }
}