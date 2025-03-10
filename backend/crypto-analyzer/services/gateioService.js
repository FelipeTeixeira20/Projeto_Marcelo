const axios = require('axios');

const GATEIO_API_URL = "https://api.gateio.ws/api/v4/spot/tickers";

async function getCryptoPrice(symbol = null) {
    try {
        const response = await axios.get(GATEIO_API_URL);
        const formattedData = response.data.map(item => ({
            symbol: item.currency_pair.replace('_', ''), // Remove o underscore do nome da moeda
            price: parseFloat(item.last).toFixed(8) // Formata o preço para 8 casas decimais
        }));

        if (symbol) {
            return formattedData.find(item => item.symbol.toUpperCase() === symbol.toUpperCase()) || null;
        }

        return formattedData;
    } catch (error) {
        console.error("Erro ao buscar preço da Gate.io:", error.message);
        throw error;
    }
}

module.exports = { getCryptoPrice };
