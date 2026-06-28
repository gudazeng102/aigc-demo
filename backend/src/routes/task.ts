import { Router } from 'express';
import db from '../db';

const router = Router();

interface TaskRow {
  id: number;
  content: string;
  type: string;
  status: string;
  result_url: string;
  created_at: string;
}

router.post('/tasks', (req, res) => {
  const { content, type = 'image' } = req.body;

  if (!content || typeof content !== 'string' || content.trim() === '') {
    res.status(400).json({ success: false, message: 'content 为必填项' });
    return;
  }

  const insert = db.prepare('INSERT INTO tasks (content, type) VALUES (?, ?)');
  const info = insert.run(content.trim(), type);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid) as TaskRow;
  res.status(201).json(row);
});

router.get('/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as TaskRow[];
  res.json({ data: rows });
});

router.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const info = stmt.run(id);

  if (info.changes === 0) {
    res.status(404).json({ success: false, message: '任务不存在' });
    return;
  }

  res.json({ success: true, message: '删除成功' });
});

export default router;
