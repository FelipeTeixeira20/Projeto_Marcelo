const express = require('express');
const axios = require('axios');

const router = express.Router();
const MEXC_API_URL = "https://api.mexc.com/api/v3";
const MEXC_FUTURES_API_URL = "https://contract.mexc.com/api/v1";


const mexcAPIKey = process.env.MEXC_API_KEY;
const mexcSecretKey = process.env.MEXC_SECRET_KEY;

// 🔹 Teste da API MEXC
router.get('/', (req, res) => {
    res.json({ message: "API da MEXC funcionando! Use /spot/prices ou /futures/prices." });
});

// 🔹 Preços Spot
router.get('/spot/prices', async (req, res) => {
    try {
        const response = await axios.get(`${MEXC_API_URL}/ticker/price`);
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro ao buscar preços Spot da MEXC:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Spot da MEXC" });
    }
});

// 🔹 Preços Futures (Corrigido)
router.get('/futures/prices', async (req, res) => {
    try {
        const response = await axios.get(`${MEXC_FUTURES_API_URL}/contract/ticker`);
        res.json(response.data.data);
    } catch (error) {
        console.error("❌ Erro ao buscar preços Futures da MEXC:", error.message);
        res.status(500).json({ error: "Erro ao obter preços Futures da MEXC" });
    }
});

module.exports = router;
