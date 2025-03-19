const express = require('express');
const axios = require('axios');

const router = express.Router();
const BITGET_API_URL = "https://api.bitget.com/api/v2";
const BITGET_FUTURES_API_URL = "https://api.bitget.com/api/mix/v1";

// 🔹 Teste da API Bitget
router.get('/', (req, res) => {
    res.json({ message: "API da Bitget funcionando! Use /spot/prices ou /futures/prices." });
});

// 🔹 Preços Spot
router.get('/spot/prices', async (req, res) => {
    try {
        const response = await axios.get(`${BITGET_API_URL}/market/tickers`);
        if (response.data && response.data.data) {
            res.json(response.data.data);
        } else {
            throw new Error("Dados inválidos recebidos da API Spot");
        }
    } catch (error) {
        console.error("❌ Erro ao buscar preços Spot da Bitget:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Spot da Bitget" });
    }
});

// 🔹 Preços Futures (Corrigido)
router.get('/futures/prices', async (req, res) => {
    try {
        const response = await axios.get(`${BITGET_FUTURES_API_URL}/market/tickers?productType=umcbl`);
        if (response.data && response.data.data) {
            res.json(response.data.data);
        } else {
            throw new Error("Dados inválidos recebidos da API Futures");
        }
    } catch (error) {
        console.error("❌ Erro ao buscar preços Futures da Bitget:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Futures da Bitget" });
    }
});

module.exports = router;
