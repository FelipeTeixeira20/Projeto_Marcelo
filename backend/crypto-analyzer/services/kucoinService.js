const axios = require('axios');

const KUCOIN_API_URL = "https://api.kucoin.com/api/v1/market/allTickers";

async function getCryptoPrice(symbol = null) {
    try {
        const response = await axios.get(KUCOIN_API_URL);
        const formattedData = response.data.data.ticker.map(item => ({
            symbol: item.symbol.replace('-', ''), // Remove o traço do símbolo
            price: parseFloat(item.last).toFixed(8) // Formata o preço para 8 casas decimais
        }));

        if (symbol) {
            return formattedData.find(item => item.symbol.toUpperCase() === symbol.toUpperCase()) || null;
        }
        return formattedData;
    } catch (error) {
        console.error("Erro ao buscar preço da KuCoin:", error.message);
        throw error;
    }
}

module.exports = { getCryptoPrice };
