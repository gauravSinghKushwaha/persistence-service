const log = require('./../log/logger.js');
const helmet = require('helmet');
const compression = require('compression')
const express = require('express');
const app = express();
app.use(helmet());
const router = express.Router();
