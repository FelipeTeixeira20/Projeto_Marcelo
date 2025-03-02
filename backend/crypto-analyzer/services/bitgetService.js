const axios = require('axios');

const BITGET_API_URL = "https://api.bitget.com/api/spot/v1/market/tickers";

async function getCryptoPrice(symbol) {
    try {
        const response = await axios.get(BITGET_API_URL);
        // Convertendo para o mesmo formato da MEXC
        const formattedData = response.data.data.map(item => ({
            symbol: item.symbol.replace('_', ''),
            price: item.close
        }));
        return formattedData;
    } catch (error) {
        console.error("Erro ao buscar preço da Bitget:", error);
        throw error;
    }
}

module.exports = { getCryptoPrice }; 