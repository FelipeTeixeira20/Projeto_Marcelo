const express = require('express');
const router = express.Router();
const Crypto = require('../models/Crypto');

router.post('/save', async (req, res) => {
    try {
        const { name, exchange, price, volume } = req.body;
        const crypto = new Crypto({ name, exchange, price, volume });
        await crypto.save();
        res.status(201).json({ message: 'Dados salvos!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar dados' });
    }
});

router.get('/cryptos', async (req, res) => {
    const cryptos = await Crypto.find();
    res.json(cryptos);
});

module.exports = router;
