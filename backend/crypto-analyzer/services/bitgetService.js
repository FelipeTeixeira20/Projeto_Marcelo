const axios = require('axios');

const BITGET_API_URL = "https://api.bitget.com/api/spot/v1/market/tickers";

async function getCryptoPrice(symbol = null) {
    try {
        const response = await axios.get(BITGET_API_URL);
        const formattedData = response.data.data.map(item => ({
            symbol: item.symbol.replace('_', ''), // Remove _ do nome da moeda
            price: parseFloat(item.close).toFixed(8) // Formata o preço para 8 casas decimais
        }));

        if (symbol) {
            return formattedData.find(item => item.symbol.toUpperCase() === symbol.toUpperCase()) || null;
        }
        return formattedData;
    } catch (error) {
        console.error("Erro ao buscar preço da Bitget:", error.message);
        throw error;
    }
}

module.exports = { getCryptoPrice };
