import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// 创建预设
router.post('/presets', (req: Request, res: Response) => {
  const { name, description = '', mode, prompt = '', params } = req.body;

  if (!name || !mode || !params) {
    res.status(400).json({ error: '缺少必要参数：name, mode, params' });
    return;
  }

  const stmt = db.prepare(
    'INSERT INTO presets (name, description, mode, prompt, params) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, description, mode, prompt, JSON.stringify(params));

  res.json({ id: result.lastInsertRowid, name, mode });
});

// 获取预设列表
router.get('/presets', (_req: Request, res: Response) => {
  const presets = db.prepare(
    'SELECT * FROM presets ORDER BY created_at DESC'
  ).all();
  res.json(presets);
});

// 更新预设（只改名称和描述）
router.put('/presets/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description = '' } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name 不能为空' });
    return;
  }

  db.prepare(
    'UPDATE presets SET name = ?, description = ? WHERE id = ?'
  ).run(name, description, id);

  res.json({ success: true });
});

// 删除预设
router.delete('/presets/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM presets WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;