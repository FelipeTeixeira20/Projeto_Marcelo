import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001/api'
});

export const exchangeService = {
    // Função que usa a rota combinada do seu backend
    getAllPricesForSymbol: async (symbol) => {
        try {
            const response = await api.get(`/exchanges/prices/${symbol}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar preços:', error);
            throw error;
        }
    }
};

export default api; 