const express = require('express');
const router = express.Router();
const Crypto = require('../models/Crypto');

// Rota para salvar dados manualmente
router.post('/save', async (req, res) => {
    try {
        const { name, exchange, price, volume } = req.body;
        const crypto = new Crypto({ name, exchange, price, volume });
        await crypto.save();
        res.status(201).json({ message: 'Dados salvos!' });
    } catch (error) {
        console.error("Erro ao salvar dados:", error);
        res.status(500).json({ error: 'Erro ao salvar dados' });
    }
});

// Rota para buscar todas as criptomoedas salvas no MongoDB
router.get('/cryptos', async (req, res) => {
    try {
        const cryptos = await Crypto.find();
        if (cryptos.length === 0) {
            return res.status(404).json({ message: "Nenhuma criptomoeda encontrada no banco." });
        }
        res.json(cryptos);
    } catch (error) {
        console.error("Erro ao buscar criptomoedas do banco:", error);
        res.status(500).json({ error: "Erro ao buscar dados do banco" });
    }
});

module.exports = router;
