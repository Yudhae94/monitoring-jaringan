'use strict';

const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');

const appConfig = require('./config/app');
const sessionConfig = require('./config/session');
const { registerRoutes } = require('./routes');
const {
  localsMiddleware, errorMiddleware, csrfMiddleware, authMiddleware,
} = require('./middlewares');

function createApp() {
  const app = express();

  // ---------- View engine (EJS + layout) ----------
  app.set('view engine', 'ejs');
  app.set('views', appConfig.paths.views);
  app.set('layout', 'layouts/main');
  app.set('layout extractScripts', true);
  app.set('layout extractStyles', true);
  app.set('trust proxy', 1);
  app.use(expressLayouts);

  // ---------- Keamanan ----------
  app.use(
    helmet({
      contentSecurityPolicy: false, // dimatikan agar Chart.js CDN & inline script bisa jalan
      crossOriginEmbedderPolicy: false,
    })
  );

  // ---------- Logging ----------
  if (appConfig.env === 'development') {
    app.use(morgan('dev'));
  }

  // ---------- Parser & static ----------
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(methodOverride('_method'));
  app.use(express.static(appConfig.paths.public, { maxAge: appConfig.env === 'production' ? '7d' : 0 }));
  app.use('/uploads', express.static(appConfig.paths.uploads));

  // ---------- Session ----------
  app.use(
    session({
      ...sessionConfig,
      store: new SQLiteStore({
        db: 'sessions.db',
        dir: appConfig.paths.data,
        concurrentDB: true,
      }),
    })
  );

  // ---------- Flash message ----------
  app.use(flash());

  // ---------- Variabel global untuk view ----------
  // Harus SEBELUM CSRF: saat token CSRF ditolak, halaman error tetap
  // butuh res.locals (app, rt, fmt, title) supaya bisa dirender.
  app.use(localsMiddleware);

  // ---------- CSRF ----------
  app.use(csrfMiddleware.csrfProtection);

  // ---------- Route health check (untuk monitoring) ----------
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      app: appConfig.name,
      rt: appConfig.rt.label,
      env: appConfig.env,
      time: new Date().toISOString(),
    });
  });

  // ---------- Routes ----------
  registerRoutes(app);

  // ---------- 404 & Error handler (harus paling akhir) ----------
  app.use(errorMiddleware.notFoundHandler);
  app.use(errorMiddleware.errorHandler);

  return app;
}

module.exports = createApp;
module.exports.createApp = createApp;
