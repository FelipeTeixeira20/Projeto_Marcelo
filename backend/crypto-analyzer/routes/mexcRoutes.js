const express = require('express');
const axios = require('axios');

const router = express.Router();
const MEXC_API_URL = "https://api.mexc.com/api/v3/ticker/price";

// Rota para buscar os preços manualmente (para testes)
router.get('/prices', async (req, res) => {
    try {
        const response = await axios.get(MEXC_API_URL);

        if (!response.data || response.data.length === 0) {
            return res.status(404).json({ error: "Nenhuma moeda encontrada na MEXC" });
        }

        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar preços da MEXC:", error);
        res.status(500).json({ error: "Erro ao obter preços da MEXC" });
    }
});

module.exports = router;
