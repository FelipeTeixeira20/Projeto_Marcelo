const axios = require('axios');

const BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/price";

async function getCryptoPrice(symbol) {
    try {
        const url = symbol ? `${BINANCE_API_URL}?symbol=${symbol}` : BINANCE_API_URL; // Se não passar symbol, retorna todas as moedas
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar preço da Binance:", error.response ? error.response.data : error.message);
        return null;
    }
}

// Testes
getCryptoPrice("BTCUSDT").then(console.log); // Apenas BTCUSDT
getCryptoPrice().then(console.log); // Todas as moedas

module.exports = { getCryptoPrice };
