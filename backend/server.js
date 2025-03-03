const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const { auth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
require('dotenv').config();

// Configuração do Express
const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Conexão com MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB Atlas'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rotas de gerenciamento de usuários
app.use('/api/users', userRoutes);

// Rota temporária para criar usuário admin (REMOVER DEPOIS)
app.get('/setup-admin', async (req, res) => {
    try {
        const User = require('./models/User');
        const admin = new User({
            username: 'felipe.teixeira',
            password: '123456',
            isAdmin: true
        });
        await admin.save();
        res.json({ message: 'Administrador criado com sucesso', admin: admin.username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criação do servidor HTTP
const server = http.createServer(app);

// Configuração do WebSocket
const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    perMessageDeflate: false
});

let lastPrices = null;
let updateInterval = null;

// Log de IPs conectados
const connectedClients = new Set();

// Função para buscar preços da MEXC
async function fetchPrices() {
    try {
        const response = await axios.get('https://api.mexc.com/api/v3/ticker/price');
        if (response.data && Array.isArray(response.data)) {
            lastPrices = response.data;
            return response.data;
        }
        throw new Error('Dados inválidos recebidos da API');
    } catch (error) {
        console.error('Erro ao buscar preços da MEXC:', error.message);
        return null;
    }
}

// Função para enviar dados para todos os clientes
function broadcast(data) {
    if (!data) return;

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                const message = JSON.stringify(data);
                client.send(message);
            } catch (error) {
                console.error('Erro ao enviar dados para cliente:', error.message);
            }
        }
    });
}

// Função para iniciar atualizações periódicas
function startPriceUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }

    updateInterval = setInterval(async () => {
        const prices = await fetchPrices();
        if (prices) {
            broadcast(prices);
        }
    }, 2000);
}

// Configuração dos eventos do WebSocket
wss.on('connection', async (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    connectedClients.add(clientIP);
    console.log(`Nova conexão WebSocket estabelecida de ${clientIP}`);
    console.log(`Clientes conectados: ${Array.from(connectedClients).join(', ')}`);

    // Envia dados iniciais para o novo cliente
    const initialPrices = lastPrices || await fetchPrices();
    if (initialPrices) {
        try {
            ws.send(JSON.stringify(initialPrices));
        } catch (error) {
            console.error('Erro ao enviar dados iniciais:', error.message);
        }
    }

    // Configuração do ping para manter a conexão ativa
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 30000);

    // Tratamento de erros e fechamento
    ws.on('error', (error) => {
        console.error('Erro na conexão WebSocket:', error.message);
    });

    ws.on('close', () => {
        connectedClients.delete(clientIP);
        console.log(`Cliente ${clientIP} desconectado`);
        console.log(`Clientes restantes: ${Array.from(connectedClients).join(', ')}`);
        clearInterval(pingInterval);
    });

    ws.on('pong', () => {
        // Cliente respondeu ao ping, conexão está ativa
        ws.isAlive = true;
    });
});

// Rota de status do servidor
app.get('/', (req, res) => {
    const clientIP = req.ip;
    console.log(`Acesso à página inicial de ${clientIP}`);
    res.json({
        status: 'online',
        websocket: `ws://${req.headers.host}/ws`,
        clients: wss.clients.size,
        connectedIPs: Array.from(connectedClients),
        lastUpdate: lastPrices ? new Date().toISOString() : null
    });
});

// Rota protegida para dados das criptomoedas
app.get('/api/mexc/prices', auth, async (req, res) => {
    try {
        const prices = await fetchPrices();
        if (prices) {
            res.json(prices);
        } else {
            res.status(503).json({ error: 'Serviço temporariamente indisponível' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Adicione esta rota junto com as outras rotas da API
app.get('/api/mexc/ticker/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        console.log("Buscando dados para o símbolo:", symbol);
        const response = await axios.get('https://api.mexc.com/api/v3/ticker/24hr', {
            params: { symbol }
        });
        console.log("Resposta da MEXC:", response.data);
        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar dados do ticker:", error.response?.data || error.message);
        res.status(500).json({ error: "Erro ao obter dados do ticker" });
    }
});

// Inicialização do servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`);
    console.log(`WebSocket disponível em ws://0.0.0.0:${PORT}/ws`);
    console.log('Para acessar de outros dispositivos na rede, use o IP da máquina');
    startPriceUpdates();
});

// Tratamento de erros do processo
process.on('uncaughtException', (error) => {
    console.error('Erro não tratado:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Promise rejeitada não tratada:', error);
});

// Limpeza ao encerrar o servidor
process.on('SIGTERM', () => {
    clearInterval(updateInterval);
    server.close(() => {
        console.log('Servidor encerrado');
        process.exit(0);
    });
}); 