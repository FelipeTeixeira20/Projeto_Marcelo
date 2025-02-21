require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Conectar ao MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB conectado com sucesso!'))
    .catch(err => console.log('❌ Erro ao conectar ao MongoDB:', err));

const MEXC_API_URL = "https://api.mexc.com/api/v3/ticker/price";

// Função para obter preços em tempo real e enviar para o frontend via WebSockets
const fetchCryptoPrices = async () => {
    try {
        const response = await axios.get("https://api.mexc.com/api/v3/ticker/price");

        if (response.data) {
            const formattedData = response.data.map(crypto => ({
                symbol: crypto.symbol,
                price: parseFloat(crypto.price),
                volume: Math.random() * 1000, // Simulando volume (substitua por volume real se disponível)
            }));

            io.emit("cryptoPrices", formattedData); // Enviando para o frontend via WebSocket
        }
    } catch (error) {
        console.error("Erro ao buscar preços da MEXC:", error);
    }
};

// Atualizar os preços e volumes a cada 1 segundo
setInterval(fetchCryptoPrices, 1000);



io.on("connection", (socket) => {
    console.log("🟢 Novo cliente conectado:", socket.id);

    // Enviar os preços iniciais ao conectar
    fetchCryptoPrices();

    socket.on("disconnect", () => {
        console.log("🔴 Cliente desconectado:", socket.id);
    });
});

// Importando as rotas do MongoDB e MEXC
const cryptoRoutes = require('./routes/cryptoRoutes');
app.use('/api/crypto', cryptoRoutes);

const mexcRoutes = require('./routes/mexcRoutes');
app.use('/api/mexc', mexcRoutes);

app.get('/', (req, res) => {
    res.send('API funcionando!');
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
