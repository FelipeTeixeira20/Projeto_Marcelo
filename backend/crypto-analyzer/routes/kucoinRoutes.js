const express = require('express');
const axios = require('axios');

const router = express.Router();
const KUCOIN_API_URL = "https://api.kucoin.com/api/v1";
const KUCOIN_FUTURES_API_URL = "https://api-futures.kucoin.com/api/v1";

// 🔹 Teste da API KuCoin
router.get('/', (req, res) => {
    res.json({ message: "API da KuCoin funcionando! Use /spot/prices ou /futures/prices." });
});

// 🔹 Preços Spot
router.get('/spot/prices', async (req, res) => {
    try {
        const response = await axios.get(`${KUCOIN_API_URL}/market/allTickers`);
        res.json(response.data.data.ticker);
    } catch (error) {
        console.error("❌ Erro ao buscar preços Spot da KuCoin:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Spot da KuCoin" });
    }
});

// 🔹 Preços Futures
router.get('/futures/prices', async (req, res) => {
    try {
        const response = await axios.get(`${KUCOIN_FUTURES_API_URL}/contracts/active`);
        res.json(response.data.data);
    } catch (error) {
        console.error("❌ Erro ao buscar preços Futures da KuCoin:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Futures da KuCoin" });
    }
});

module.exports = router;
