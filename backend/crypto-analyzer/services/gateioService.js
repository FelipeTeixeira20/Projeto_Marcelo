const axios = require('axios');

const GATEIO_API_URL = "https://api.gateio.ws/api/v4/spot/tickers";

async function getCryptoPrice(symbol) {
    try {
        const response = await axios.get(GATEIO_API_URL);
        // Convertendo para o mesmo formato da MEXC
        const formattedData = response.data.map(item => ({
            symbol: item.currency_pair.replace('_', ''),
            price: item.last
        }));
        return formattedData;
    } catch (error) {
        console.error("Erro ao buscar preço da Gate.io:", error);
        throw error;
    }
}

module.exports = { getCryptoPrice }; 