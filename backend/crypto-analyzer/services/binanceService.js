const axios = require('axios');

const BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/price";

async function getCryptoPrice(symbol) {
    try {
        const response = await axios.get(BINANCE_API_URL);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar preço da Binance:", error);
        throw error;
    }
}

module.exports = { getCryptoPrice }; 