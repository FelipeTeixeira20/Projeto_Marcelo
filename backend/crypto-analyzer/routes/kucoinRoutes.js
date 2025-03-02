const express = require('express');
const axios = require('axios');
const router = express.Router();

const KUCOIN_API_URL = "https://api.kucoin.com/api/v1/market/allTickers";

router.get('/prices', async (req, res) => {
    try {
        const response = await axios.get(KUCOIN_API_URL);

        if (!response.data || !response.data.data || !response.data.data.ticker) {
            return res.status(404).json({ error: "Nenhuma moeda encontrada na KuCoin" });
        }

        res.json(response.data.data.ticker);
    } catch (error) {
        console.error("Erro ao buscar preços da KuCoin:", error);
        res.status(500).json({ error: "Erro ao obter preços da KuCoin" });
    }
});

module.exports = router; 