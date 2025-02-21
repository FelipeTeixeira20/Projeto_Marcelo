const axios = require('axios');

const MEXC_API_URL = "https://api.mexc.com/api/v3/ticker/price";

async function getCryptoPrice(symbol) {
    try {
        const response = await axios.get(`${MEXC_API_URL}?symbol=${symbol}`);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar preço da MEXC:", error);
        return null;
    }
}

module.exports = { getCryptoPrice };
