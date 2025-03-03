const express = require('express');
const axios = require('axios');

const router = express.Router();
const MEXC_API_URL = "https://api.mexc.com/api/v3";

// Rota para buscar os preços
router.get('/prices', async (req, res) => {
    try {
        const response = await axios.get(`${MEXC_API_URL}/ticker/price`);
        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar preços da MEXC:", error);
        res.status(500).json({ error: "Erro ao obter preços da MEXC" });
    }
});

// Adicione esta nova rota para buscar dados detalhados
router.get('/ticker/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        console.log("Buscando dados para o símbolo:", symbol); // Debug
        const response = await axios.get(`${MEXC_API_URL}/ticker/24hr`, {
            params: { symbol }
        });
        console.log("Resposta da MEXC:", response.data); // Debug
        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar dados do ticker:", error.response?.data || error.message);
        res.status(500).json({ error: "Erro ao obter dados do ticker" });
    }
});

module.exports = router;
