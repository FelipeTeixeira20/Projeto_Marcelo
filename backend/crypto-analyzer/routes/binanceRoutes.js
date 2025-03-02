const express = require('express');
const axios = require('axios');
const router = express.Router();

const BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/price";

router.get('/prices', async (req, res) => {
    try {
        const response = await axios.get(BINANCE_API_URL);

        if (!response.data || response.data.length === 0) {
            return res.status(404).json({ error: "Nenhuma moeda encontrada na Binance" });
        }

        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar preços da Binance:", error);
        res.status(500).json({ error: "Erro ao obter preços da Binance" });
    }
});

module.exports = router; 