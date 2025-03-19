const express = require('express');
const axios = require('axios');

const router = express.Router();
const GATEIO_API_URL = "https://api.gateio.ws/api/v4/spot";
const GATEIO_FUTURES_API_URL = "https://api.gateio.ws/api/v4/futures/usdt";

// 🔹 Teste da API Gate.io
router.get('/', (req, res) => {
    res.json({ message: "API da Gate.io funcionando! Use /spot/prices ou /futures/prices." });
});

// 🔹 Preços Spot
router.get('/spot/prices', async (req, res) => {
    try {
        const response = await axios.get(`${GATEIO_API_URL}/tickers`);
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro ao buscar preços Spot da Gate.io:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Spot da Gate.io" });
    }
});

// 🔹 Preços Futures
router.get('/futures/prices', async (req, res) => {
    try {
        const response = await axios.get(`${GATEIO_FUTURES_API_URL}/tickers`);
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro ao buscar preços Futures da Gate.io:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Futures da Gate.io" });
    }
});

module.exports = router;
