const express = require('express');
const axios = require('axios');
const Crypto = require('../models/Crypto'); // Importando o modelo do MongoDB

const router = express.Router();

const MEXC_API_URL = "https://api.mexc.com/api/v3/ticker/price";

// Rota para buscar e salvar todas as criptomoedas da MEXC no banco
router.get('/saveAll', async (req, res) => {
    try {
        const response = await axios.get(MEXC_API_URL);

        if (!response.data || response.data.length === 0) {
            return res.status(404).json({ error: "Nenhuma moeda encontrada na MEXC" });
        }

        // Criando um array de criptomoedas para salvar no MongoDB
        const cryptosToSave = response.data.map(crypto => ({
            name: crypto.symbol,
            exchange: "MEXC",
            price: parseFloat(crypto.price),
            volume: Math.random() * 1000 // Simulando volume aleatório
        }));

        // Salvando todas as moedas no banco de dados
        await Crypto.insertMany(cryptosToSave);

        res.json({ message: "Todas as moedas foram salvas no banco!", data: cryptosToSave });

    } catch (error) {
        console.error("Erro ao salvar moedas da MEXC:", error);
        res.status(500).json({ error: "Erro ao salvar moedas da MEXC" });
    }
});

module.exports = router;
