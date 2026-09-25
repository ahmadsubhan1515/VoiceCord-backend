// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Security headers with CSP permitting Discord CDN assets & fonts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com', 'https://*.discord.com', 'https://*'],
        connectSrc: ["'self'", 'https://discord.com', 'wss://gateway.discord.gg'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
app.use(cors());

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Application routes
app.use(routes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
