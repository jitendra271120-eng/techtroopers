import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Techtroopers API', time: new Date().toISOString() });
});

app.get('/api/platform-summary', (_req, res) => {
  res.json({
    name: 'Techtroopers',
    modules: ['Exams', 'E-books', 'Projects', 'Road Maps', 'Vacancies', 'TroopersTalk'],
    mode: 'demo-ready / Firebase-ready'
  });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.path }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Techtroopers API running on http://localhost:${port}`));
