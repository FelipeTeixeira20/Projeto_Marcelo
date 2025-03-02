const express = require('express');
const axios = require('axios');
const router = express.Router();

const BITGET_API_URL = "https://api.bitget.com/api/spot/v1/market/tickers";

router.get('/prices', async (req, res) => {
    try {
        const response = await axios.get(BITGET_API_URL);

        if (!response.data || !response.data.data || response.data.data.length === 0) {
            return res.status(404).json({ error: "Nenhuma moeda encontrada na Bitget" });
        }

        res.json(response.data.data);
    } catch (error) {
        console.error("Erro ao buscar preços da Bitget:", error);
        res.status(500).json({ error: "Erro ao obter preços da Bitget" });
    }
});

module.exports = router; 