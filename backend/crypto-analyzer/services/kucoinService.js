const axios = require('axios');

const KUCOIN_API_URL = "https://api.kucoin.com/api/v1/market/allTickers";

async function getCryptoPrice(symbol) {
    try {
        const response = await axios.get(KUCOIN_API_URL);
        // Convertendo para o mesmo formato da MEXC
        const formattedData = response.data.data.ticker.map(item => ({
            symbol: item.symbol.replace('-', ''),
            price: item.last
        }));
        return formattedData;
    } catch (error) {
        console.error("Erro ao buscar preço da KuCoin:", error);
        throw error;
    }
}

module.exports = { getCryptoPrice }; 