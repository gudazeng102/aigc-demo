import { Router } from 'express';
import { DeepSeekAdapter } from '../llm/deepseek';
import { getPlatformAdapter } from '../platforms/factory';
import db from '../db';

const router = Router();
const deepseek = new DeepSeekAdapter();

// 创建会话
router.post('/chat/sessions', (req, res) => {
  const { mode = 'chat' } = req.body;
  const stmt = db.prepare('INSERT INTO chat_sessions (mode) VALUES (?)');
  const result = stmt.run(mode);
  const sessionId = result.lastInsertRowid;

  if (mode === 'chat') {
    db.prepare(
      'INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)'
    ).run(sessionId, 'assistant', '你好，我是您的人工助手，请问需要什么帮助？', 'text');
  }

  res.json({ id: sessionId, mode });
});

// 获取会话列表
router.get('/chat/sessions', (req, res) => {
  const sessions = db.prepare(
    'SELECT * FROM chat_sessions ORDER BY updated_at DESC'
  ).all();
  res.json(sessions);
});

// 删除会话
router.delete('/chat/sessions/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(id);
  res.json({ success: true });
});

// 获取会话消息
router.get('/chat/sessions/:id/messages', (req, res) => {
  const { id } = req.params;
  const messages = db.prepare(
    'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
  ).all(id);
  res.json(messages);
});

// 发送消息（核心路由）- 第七轮：支持多轮上下文、参数继承、重新生成
router.post('/chat/message', async (req, res) => {
  const { sessionId, message, mode, params: userParams = {}, isRegenerate = false } = req.body;

  if (!sessionId || !message || !mode) {
    return res.status(400).json({ error: '缺少必要参数：sessionId, message, mode' });
  }

  // 保存用户消息
  db.prepare(
    'INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)'
  ).run(sessionId, 'user', message, 'text');

  db.prepare('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId);

  // 普通对话模式（带多轮上下文）
  if (mode === 'chat') {
    try {
      // 查询历史消息（最近 10 条，用于上下文）
      const historyRows = db.prepare(
        'SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 10'
      ).all(sessionId);
      const history = (historyRows as Array<{ role: string; content: string }>).reverse();

      const reply = await deepseek.chatWithHistory(message, history);
      db.prepare(
        'INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)'
      ).run(sessionId, 'assistant', reply, 'text');
      res.json({ reply, type: 'text' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // 生成对话模式：先返回 processing
  res.json({ status: 'processing' });

  // 异步执行生成
  (async () => {
    try {
      // 1. 查询历史消息（最近 10 条，用于上下文）
      const historyRows = db.prepare(
        'SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 10'
      ).all(sessionId);
      const history = (historyRows as Array<{ role: string; content: string }>).reverse();

      // 2. 查询上一轮参数（最近一条 assistant 生成消息的 params）
      const lastAssistantRow = db.prepare(
        `SELECT params FROM chat_messages 
         WHERE session_id = ? AND role = 'assistant' AND type = ? AND params != ''
         ORDER BY created_at DESC LIMIT 1`
      ).get(sessionId, mode) as { params: string } | undefined;

      const lastParams: Record<string, any> = lastAssistantRow?.params
        ? JSON.parse(lastAssistantRow.params)
        : {};

      // 3. 判断是否为重新生成指令（后端兜底识别）
      const regenerateKeywords = ['重新生成', '再来一次', '再生成', '再来一张', '再来一段', '重做'];
      const isRegenerateDetected = isRegenerate || regenerateKeywords.some(kw => message.includes(kw));

      // 4. 调用 DeepSeek 意图识别（多轮上下文版）
      const parsed = await deepseek.parseIntent(
        message,
        mode,
        history,
        lastParams,
        isRegenerateDetected
      );

      // 5. 合并参数：上一轮 → LLM 推荐 → 用户手动（优先级递增）
      const finalParams = { ...lastParams, ...parsed.params, ...userParams };

      // 6. 调用即梦适配器
      const adapter = getPlatformAdapter('jimeng');
      const { platformTaskId } = await adapter.submitTask(
        parsed.prompt,
        mode,
        finalParams
      );

      // 7. 轮询查询结果
      let result: any;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        result = await adapter.queryTask(platformTaskId);
        if (result.status === 'completed' || result.status === 'failed') break;
      }

      // 8. 保存结果
      if (result?.status === 'completed') {
        db.prepare(
          'INSERT INTO chat_messages (session_id, role, content, type, result_url, params) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          sessionId,
          'assistant',
          '生成完成',
          mode,
          result.resultUrl,
          JSON.stringify(finalParams)
        );
      } else {
        db.prepare(
          'INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)'
        ).run(
          sessionId,
          'assistant',
          `生成失败：${result?.errorMessage || '任务超时或未知错误'}`,
          'text'
        );
      }

      db.prepare('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId);
    } catch (error: any) {
      console.error('[ChatRoute] 生成处理失败:', error);
      db.prepare(
        'INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)'
      ).run(sessionId, 'assistant', `处理失败：${error.message}`, 'text');
    }
  })();
});

export default router;