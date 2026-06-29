"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const factory_1 = require("../platforms/factory");
const router = (0, express_1.Router)();
const MAX_POLL_COUNT = 60;
const POLL_INTERVAL_MS = 3000;
function startTaskPolling(taskId, platformTaskId, adapter) {
    let pollCount = 0;
    const interval = setInterval(async () => {
        pollCount += 1;
        try {
            const result = await adapter.queryTask(platformTaskId);
            if (result.status === 'completed') {
                const update = db_1.default.prepare('UPDATE tasks SET status = ?, result_url = ? WHERE id = ?');
                update.run('completed', result.resultUrl || '', taskId);
                clearInterval(interval);
                return;
            }
            if (result.status === 'failed') {
                const update = db_1.default.prepare('UPDATE tasks SET status = ?, error_message = ? WHERE id = ?');
                update.run('failed', result.errorMessage || '生成失败', taskId);
                clearInterval(interval);
                return;
            }
            if (pollCount >= MAX_POLL_COUNT) {
                const update = db_1.default.prepare('UPDATE tasks SET status = ?, error_message = ? WHERE id = ?');
                update.run('failed', '轮询超时：超过最大轮询次数', taskId);
                clearInterval(interval);
            }
        }
        catch (error) {
            const update = db_1.default.prepare('UPDATE tasks SET status = ?, error_message = ? WHERE id = ?');
            update.run('failed', error.message || '查询任务状态时出错', taskId);
            clearInterval(interval);
        }
    }, POLL_INTERVAL_MS);
}
router.post('/tasks', async (req, res) => {
    const { content, type = 'image' } = req.body;
    const platform = req.body.platform || process.env.DEFAULT_PLATFORM || 'jimeng';
    if (!content || typeof content !== 'string' || content.trim() === '') {
        res.status(400).json({ success: false, message: 'content 为必填项' });
        return;
    }
    const taskType = type === 'video' ? 'video' : 'image';
    // 透传所有可选参数给适配器
    const options = {
        model: req.body.model,
        resolution: req.body.resolution,
        ratio: req.body.ratio,
        duration: req.body.duration,
        imageUrl: req.body.imageUrl,
        endImageUrl: req.body.endImageUrl,
        generateAudio: req.body.generateAudio,
        draft: req.body.draft,
    };
    // 1. 先写入数据库，状态为 pending
    const insert = db_1.default.prepare('INSERT INTO tasks (content, type, status, platform) VALUES (?, ?, ?, ?)');
    const info = insert.run(content.trim(), taskType, 'pending', platform);
    const taskId = info.lastInsertRowid;
    try {
        // 2. 调用平台适配器提交任务
        const adapter = (0, factory_1.getPlatformAdapter)(platform);
        const { platformTaskId } = await adapter.submitTask(content.trim(), taskType, options);
        // 3. 更新为 processing 并记录平台任务 ID
        const update = db_1.default.prepare('UPDATE tasks SET status = ?, platform_task_id = ? WHERE id = ?');
        update.run('processing', platformTaskId, taskId);
        // 4. 启动后端轮询
        startTaskPolling(taskId, platformTaskId, adapter);
    }
    catch (error) {
        // 提交失败，标记为 failed 并记录错误信息
        const update = db_1.default.prepare('UPDATE tasks SET status = ?, error_message = ? WHERE id = ?');
        update.run('failed', error.message || '任务提交失败', taskId);
    }
    const row = db_1.default.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    res.status(201).json(row);
});
router.get('/tasks', (req, res) => {
    const rows = db_1.default.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    res.json({ data: rows });
});
router.get('/tasks/:id', (req, res) => {
    const { id } = req.params;
    const row = db_1.default.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!row) {
        res.status(404).json({ success: false, message: '任务不存在' });
        return;
    }
    res.json(row);
});
router.delete('/tasks/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db_1.default.prepare('DELETE FROM tasks WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) {
        res.status(404).json({ success: false, message: '任务不存在' });
        return;
    }
    res.json({ success: true, message: '删除成功' });
});
exports.default = router;
