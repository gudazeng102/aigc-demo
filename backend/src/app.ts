import express from 'express';
import cors from 'cors';
import taskRoutes from './routes/task';
import chatRoutes from './routes/chat';
import presetRoutes from './routes/preset';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行中' });
});

app.use('/api', taskRoutes);
app.use('/api', chatRoutes);
app.use('/api', presetRoutes);

// 全局错误处理中间件（防止请求体过大等问题导致进程崩溃）
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[AppError]', err.message || err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体过大，请减小图片大小后再试' });
  }
  res.status(500).json({ error: err.message || '内部服务器错误' });
});

export default app;
