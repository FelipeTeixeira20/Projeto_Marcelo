const express = require('express');
const axios = require('axios');

const router = express.Router();
const BINANCE_API_URL = "https://api.binance.com/api/v3";

// 🔹 Rota raiz para testar se a API está rodando
router.get('/', (req, res) => {
    res.json({ message: "API da Binance funcionando! Use /prices para preços." });
});

// 🔹 Rota para buscar preços de todas as criptomoedas
router.get('/prices', async (req, res) => {
    try {
        const response = await axios.get(`${BINANCE_API_URL}/ticker/price`);
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro ao buscar preços da Binance:", error.message);
        res.status(500).json({ error: "Erro ao obter preços da Binance" });
    }
});

// 🔹 Rota para buscar informações detalhadas de um símbolo específico (ex: BTCUSDT)
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
