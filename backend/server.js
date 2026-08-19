import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const audioDirectory = process.env.AUDIO_DIR
  ? path.resolve(process.env.AUDIO_DIR)
  : path.resolve(__dirname, '..', 'audio');

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

// Rate limiting is useful in production, but local CMS editing can make many
// autosave/refresh calls while building a test.
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
  });
  app.use('/api/', limiter);
}

// Request parsing & logging
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Static files for uploads (fallback)
app.use('/uploads', express.static('uploads'));
app.use('/audio', express.static(audioDirectory, {
  acceptRanges: true,
  etag: true,
  immutable: true,
  maxAge: '30d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

import testRoutes from './src/routes/testRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import accessRoutes from './src/routes/accessRoutes.js';
import attemptRoutes from './src/routes/attemptRoutes.js';
import courseRoutes from './src/routes/courseRoutes.js';
import tfngMasteryRoutes from './src/routes/tfngMasteryRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import visaPromotionRoutes from './src/routes/visaPromotionRoutes.js';

// Base Status Route
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Jawaaf IELTS Lab API is operating securely.',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Register API Route Handlers
app.use('/api/tests', testRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/mastery/tfng', tfngMasteryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/visa-promotions', visaPromotionRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on our servers.',
    timestamp: new Date().toISOString()
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Jawaaf IELTS Lab Server running securely on http://${HOST}:${PORT}`);
  });
}

export default app;
