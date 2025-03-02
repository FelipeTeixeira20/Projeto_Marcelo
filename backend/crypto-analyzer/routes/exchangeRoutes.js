const express = require('express');
const router = express.Router();

const { getCryptoPrice: getMexcPrice } = require('../services/mexcService');
const { getCryptoPrice: getBinancePrice } = require('../services/binanceService');
const { getCryptoPrice: getBitgetPrice } = require('../services/bitgetService');
const { getCryptoPrice: getGateioPrice } = require('../services/gateioService');
const { getCryptoPrice: getKucoinPrice } = require('../services/kucoinService');

// Rota para buscar preços de todas as exchanges
router.get('/prices/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        // Busca preços em paralelo de todas as exchanges
        const [mexcPrice, binancePrice, bitgetPrice, gateioPrice, kucoinPrice] = await Promise.all([
            getMexcPrice(symbol),
            getBinancePrice(symbol),
            getBitgetPrice(symbol),
            getGateioPrice(symbol),
            getKucoinPrice(symbol)
        ]);

        const prices = {
            symbol,
            exchanges: {
                mexc: mexcPrice,
                binance: binancePrice,
                bitget: bitgetPrice,
                gateio: gateioPrice,
                kucoin: kucoinPrice
            }
        };

        res.json(prices);
    } catch (error) {
        console.error("Erro ao buscar preços:", error);
        res.status(500).json({ error: "Erro ao obter preços das exchanges" });
    }
});

module.exports = router; 