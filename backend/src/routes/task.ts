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

function generateResultUrl(type: string, id: number): string {
  if (type === 'image') {
    return `https://picsum.photos/400/300?random=${id}`;
  }
  if (type === 'video') {
    return 'https://www.w3schools.com/html/mov_bbb.mp4';
  }
  return '';
}

router.post('/tasks', (req, res) => {
  const { content, type = 'image' } = req.body;

  if (!content || typeof content !== 'string' || content.trim() === '') {
    res.status(400).json({ success: false, message: 'content 为必填项' });
    return;
  }

  const taskType = type === 'video' ? 'video' : 'image';

  const insert = db.prepare('INSERT INTO tasks (content, type, status) VALUES (?, ?, ?)');
  const info = insert.run(content.trim(), taskType, 'pending');
  const taskId = info.lastInsertRowid as number;

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow;

  const delay = Math.floor(Math.random() * 5000) + 5000;
  setTimeout(() => {
    const resultUrl = generateResultUrl(taskType, taskId);
    const update = db.prepare('UPDATE tasks SET status = ?, result_url = ? WHERE id = ?');
    update.run('completed', resultUrl, taskId);
  }, delay);

  res.status(201).json(row);
});

router.get('/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as TaskRow[];
  res.json({ data: rows });
});

router.get('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;

  if (!row) {
    res.status(404).json({ success: false, message: '任务不存在' });
    return;
  }

  res.json(row);
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
