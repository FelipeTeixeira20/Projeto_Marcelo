const express = require('express');
const { getCryptoPrice } = require('../services/bitgetService');

const router = express.Router();

// Rota para buscar preços de todas as criptomoedas na Bitget
router.get('/prices', async (req, res) => {
    try {
        const prices = await getCryptoPrice();
        if (!prices || prices.length === 0) {
            return res.status(404).json({ error: "Nenhuma moeda encontrada" });
        }

        // Enviar a resposta no formato padronizado
        res.json(prices);
    } catch (error) {
        console.error("Erro ao buscar preços da Bitget:", error.message);
        res.status(500).json({ error: "Erro ao obter preços da Bitget" });
    }
});

// Rota para buscar um símbolo específico na Bitget
router.get('/prices/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const price = await getCryptoPrice(symbol);
        if (!price) {
            return res.status(404).json({ error: "Moeda não encontrada" });
        }

        res.json(price);
    } catch (error) {
        res.status(500).json({ error: "Erro ao obter dados da Bitget" });
    }
});

module.exports = router;
