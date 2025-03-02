const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Importação das rotas
const mexcRoutes = require('./routes/mexcRoutes');
const binanceRoutes = require('./routes/binanceRoutes');
const bitgetRoutes = require('./routes/bitgetRoutes');
const gateioRoutes = require('./routes/gateioRoutes');
const kucoinRoutes = require('./routes/kucoinRoutes');

// Registro das rotas
app.use('/api/mexc', mexcRoutes);
app.use('/api/binance', binanceRoutes);
app.use('/api/bitget', bitgetRoutes);
app.use('/api/gateio', gateioRoutes);
app.use('/api/kucoin', kucoinRoutes);

// ... resto do seu código do app.js ... 