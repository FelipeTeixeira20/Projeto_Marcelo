const express = require('express');
const axios = require('axios');

const router = express.Router();
const BINANCE_API_URL = "https://api.binance.com/api/v3";
const BINANCE_FUTURES_API_URL = "https://fapi.binance.com/fapi/v1";

// 🔹 Teste da API Binance
router.get('/', (req, res) => {
    res.json({ message: "API da Binance funcionando! Use /spot/prices ou /futures/prices." });
});

// 🔹 Preços Spot
router.get('/spot/prices', async (req, res) => {
    try {
        const response = await axios.get(`${BINANCE_API_URL}/ticker/price`);
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro ao buscar preços Spot da Binance:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Spot da Binance" });
    }
});

// 🔹 Preços Futures
router.get('/futures/prices', async (req, res) => {
    try {
        const response = await axios.get(`${BINANCE_FUTURES_API_URL}/ticker/price`);
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro ao buscar preços Futures da Binance:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Futures da Binance" });
    }
});

// 🔹 Ticker de um símbolo específico
router.get('/ticker/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        console.log("🔍 Buscando dados para:", symbol);
        const response = await axios.get(`${BINANCE_API_URL}/ticker/24hr`, { params: { symbol } });
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro ao buscar dados do ticker:", error.message);
        res.status(500).json({ error: "Erro ao obter dados do ticker" });
    }
});

module.exports = router;
