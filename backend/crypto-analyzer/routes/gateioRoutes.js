const express = require('express');
const { getCryptoPrice } = require('../services/gateioService');

const router = express.Router();

// Rota para buscar preços de todas as criptomoedas na Gate.io
router.get('/prices', async (req, res) => {
    try {
        const prices = await getCryptoPrice();
        if (!prices || prices.length === 0) {
            return res.status(404).json({ error: "Nenhuma moeda encontrada" });
        }

        res.json(prices);
    } catch (error) {
        console.error("Erro ao buscar preços da Gate.io:", error.message);
        res.status(500).json({ error: "Erro ao obter preços da Gate.io" });
    }
});

// Rota para buscar um símbolo específico na Gate.io
router.get('/prices/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const price = await getCryptoPrice(symbol);
        if (!price) {
            return res.status(404).json({ error: "Moeda não encontrada" });
        }

        res.json(price);
    } catch (error) {
        res.status(500).json({ error: "Erro ao obter dados da Gate.io" });
    }
});

module.exports = router;
