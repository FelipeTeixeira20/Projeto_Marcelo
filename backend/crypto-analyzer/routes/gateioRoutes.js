const express = require('express');
const axios = require('axios');

const router = express.Router();
const GATEIO_API_URL = "https://api.gateio.ws/api/v4/spot/tickers";

router.get('/prices', async (req, res) => {
    try {
        const response = await axios.get(GATEIO_API_URL);

        if (!response.data || response.data.length === 0) {
            return res.status(404).json({ error: "Nenhuma moeda encontrada na Gate.io" });
        }

        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar preços da Gate.io:", error);
        res.status(500).json({ error: "Erro ao obter preços da Gate.io" });
    }
});

module.exports = router; 