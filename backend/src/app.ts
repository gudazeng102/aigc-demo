import express from 'express';
import cors from 'cors';
import taskRoutes from './routes/task';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行中' });
});

app.use('/api', taskRoutes);

export default app;
