"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deepseek_1 = require("../llm/deepseek");
const factory_1 = require("../platforms/factory");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
const deepseek = new deepseek_1.DeepSeekAdapter();
// 创建会话
router.post('/api/chat/sessions', (req, res) => {
    const { mode = 'chat' } = req.body;
    const stmt = db_1.default.prepare('INSERT INTO chat_sessions (mode) VALUES (?)');
    const result = stmt.run(mode);
    const sessionId = result.lastInsertRowid;
    // 普通对话自动插入欢迎语
    if (mode === 'chat') {
        db_1.default.prepare('INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)').run(sessionId, 'assistant', '你好，我是您的人工助手，请问需要什么帮助？', 'text');
    }
    res.json({ id: sessionId, mode });
});
// 获取会话列表
router.get('/api/chat/sessions', (req, res) => {
    const sessions = db_1.default.prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC').all();
    res.json(sessions);
});
// 删除会话
router.delete('/api/chat/sessions/:id', (req, res) => {
    const { id } = req.params;
    db_1.default.prepare('DELETE FROM chat_sessions WHERE id = ?').run(id);
    res.json({ success: true });
});
// 获取会话消息
router.get('/api/chat/sessions/:id/messages', (req, res) => {
    const { id } = req.params;
    const messages = db_1.default.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC').all(id);
    res.json(messages);
});
// 发送消息（核心路由）
router.post('/api/chat/message', async (req, res) => {
    const { sessionId, message, mode, params: userParams = {} } = req.body;
    if (!sessionId || !message || !mode) {
        return res.status(400).json({ error: '缺少必要参数：sessionId, message, mode' });
    }
    // 保存用户消息
    db_1.default.prepare('INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)').run(sessionId, 'user', message, 'text');
    // 更新会话时间
    db_1.default.prepare('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId);
    // 普通对话模式
    if (mode === 'chat') {
        try {
            const reply = await deepseek.chat(message);
            db_1.default.prepare('INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)').run(sessionId, 'assistant', reply, 'text');
            res.json({ reply, type: 'text' });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
        return;
    }
    // 生成对话模式（image / video）：先返回 processing，后端异步处理
    res.json({ status: 'processing' });
    // 异步执行生成
    (async () => {
        try {
            const parsed = await deepseek.parseIntent(message, mode, userParams);
            // 合并参数：用户手动参数优先覆盖 LLM 推荐值
            const finalParams = { ...parsed.params, ...userParams };
            // 调用现有即梦适配器
            const adapter = (0, factory_1.getPlatformAdapter)('jimeng');
            const { platformTaskId } = await adapter.submitTask(parsed.prompt, mode, finalParams);
            // 轮询查询结果（最多 60 次 × 3 秒 = 3 分钟）
            let result;
            for (let i = 0; i < 60; i++) {
                await new Promise((r) => setTimeout(r, 3000));
                result = await adapter.queryTask(platformTaskId);
                if (result.status === 'completed' || result.status === 'failed')
                    break;
            }
            // 保存 AI 生成结果消息
            if (result?.status === 'completed') {
                db_1.default.prepare('INSERT INTO chat_messages (session_id, role, content, type, result_url, params) VALUES (?, ?, ?, ?, ?, ?)').run(sessionId, 'assistant', '生成完成', mode, result.resultUrl, JSON.stringify(finalParams));
            }
            else {
                db_1.default.prepare('INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)').run(sessionId, 'assistant', `生成失败：${result?.errorMessage || '任务超时或未知错误'}`, 'text');
            }
            // 更新会话时间
            db_1.default.prepare('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId);
        }
        catch (error) {
            console.error('[ChatRoute] 生成处理失败:', error);
            db_1.default.prepare('INSERT INTO chat_messages (session_id, role, content, type) VALUES (?, ?, ?, ?)').run(sessionId, 'assistant', `处理失败：${error.message}`, 'text');
        }
    })();
});
exports.default = router;
