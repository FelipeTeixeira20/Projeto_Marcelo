const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const { auth } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
require("dotenv").config();

// Configuração do Express
const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// Conexão com MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Conectado ao MongoDB Atlas"))
  .catch((err) => console.error("Erro ao conectar ao MongoDB:", err));

// Rotas de autenticação
app.use("/api/auth", authRoutes);

// Rotas de gerenciamento de usuários
app.use("/api/users", userRoutes);

// Importação das rotas das exchanges
const binanceRoutes = require("./crypto-analyzer/routes/binanceRoutes");
const bitgetRoutes = require("./crypto-analyzer/routes/bitgetRoutes");
const gateioRoutes = require("./crypto-analyzer/routes/gateioRoutes");
const kucoinRoutes = require("./crypto-analyzer/routes/kucoinRoutes");
const mexcRoutes = require("./crypto-analyzer/routes/mexcRoutes");

// Registro das rotas no Express
app.use("/api/binance", binanceRoutes);
app.use("/api/bitget", bitgetRoutes);
app.use("/api/gateio", gateioRoutes);
app.use("/api/kucoin", kucoinRoutes);
app.use("/api/mexc", mexcRoutes);

// Rota temporária para criar usuário admin (REMOVER DEPOIS)
app.get("/setup-admin", async (req, res) => {
  try {
    const User = require("./models/User");
    const admin = new User({
      username: "felipe.teixeira",
      password: "123456",
      isAdmin: true,
    });
    await admin.save();
    res.json({
      message: "Administrador criado com sucesso",
      admin: admin.username,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criação do servidor HTTP
const server = http.createServer(app);

// Configuração do WebSocket
const wss = new WebSocket.Server({
  server,
  path: "/ws",
  perMessageDeflate: false,
});

let lastPrices = null;
let updateInterval = null;

// Log de IPs conectados
const connectedClients = new Set();

function normalizeSymbol(symbol) {
  if (!symbol) return "";
  const stablecoins = [
    "USDT",
    "USD",
    "BUSD",
    "USDC",
    "DAI",
    "TUSD",
    "FDUSD",
    "USDP",
    "USDD",
  ];
  let normalized = symbol.replace(/[-_]/g, "").toUpperCase();
  for (const stablecoin of stablecoins) {
    if (normalized.endsWith(stablecoin)) {
      normalized = normalized.replace(stablecoin, "USDT");
      break;
    }
  }
  return normalized;
}

// Função para buscar preços de todas as corretoras
async function fetchPrices() {
  try {
    // Array para armazenar todos os dados de todas as corretoras
    let allPrices = [];

    // Buscar dados das outras corretoras através da nossa própria API
    const internalExchanges = ["binance", "bitget", "gateio", "kucoin", "mexc"];
    for (const exch of internalExchanges) {
      try {
        const [spot, futures] = await Promise.all([
          axios.get(`http://localhost:5000/api/${exch}/spot/prices`),
          axios.get(`http://localhost:5000/api/${exch}/futures/prices`),
        ]);

        // Aplique variação nos dados recebidos para simular mudança
        const applyRealDataFormatting = (arr, type) => arr.map(item => ({
          ...item,
          exchangeId: exch,
          type,
          price: parseFloat(item.price || item.lastPrice || item.last || 0),
          liquidity: parseFloat(
            item.quoteVolume ?? item.amount24 ?? item.volume_24h_quote ?? item.volume ?? 0
          )
        }));

        allPrices = [
          ...allPrices,
          ...applyRealDataFormatting(spot.data, "spot"),
          ...applyRealDataFormatting(futures.data, "futures")
        ];
      } catch (err) {
        console.error(`Erro ao buscar ${exch}:`, err.message);
      }
    }

    // Buscar dados externos (spot apenas) da Binance e MEXC
    const externalExchanges = [
      {
        id: "mexc",
        name: "MEXC",
        url: "https://api.mexc.com/api/v3/ticker/price",
      },
      {
        id: "binance",
        name: "Binance",
        url: "https://api.binance.com/api/v3/ticker/price",
      },
    ];

    for (const exchange of externalExchanges) {
      try {
        console.log(`Buscando dados da ${exchange.name}...`);
        const response = await axios.get(exchange.url, { timeout: 5000 });

        if (response.data && Array.isArray(response.data)) {
          const taggedData = response.data.map((item) => ({
            symbol: item.symbol,
            exchangeId: exchange.id,
            exchangeName: exchange.name,
            type: "spot",
            price: parseFloat(item.price || 0),
            liquidity: 0, // esses endpoints externos não trazem volume
          }));

          console.log(
            `✅ Recebidos ${taggedData.length} itens da ${exchange.name}`
          );
          allPrices = [...allPrices, ...taggedData];
        }
      } catch (exchangeError) {
        console.error(
          `Erro ao buscar preços da ${exchange.name}:`,
          exchangeError.message
        );
      }
    }


    // Buscar dados das outras corretoras através da nossa própria API
    // (isso é uma simplificação - em um ambiente de produção real,
    // você precisaria buscar diretamente das APIs das corretoras)
    try {
    const internalResponse = await axios.get(
      "http://localhost:5000/api/binance/spot/prices"
    );
    if (internalResponse.data && Array.isArray(internalResponse.data)) {
      const enriched = internalResponse.data.map((item) => ({
        ...item,
        exchangeId: "binance",
        type: "spot",
        price: parseFloat(item.price || 0),
        liquidity: parseFloat(
          item.quoteVolume ?? item.amount24 ?? item.volume_24h_quote ?? item.volume ?? 0
        ),
      }));
      allPrices = [...allPrices, ...enriched];
    }
  } catch (internalError) {
    console.error("Erro ao buscar dados internos:", internalError.message);
  }


    // Se não conseguimos dados de nenhuma corretora, retornar null
    if (allPrices.length === 0) {
      throw new Error("Não foi possível obter dados de nenhuma corretora");
    }

    console.log(`Total de preços coletados: ${allPrices.length}`);

    const formatted = allPrices.map((item) => {
      const exchangeId = item.exchangeId?.toLowerCase() || item.exchange?.toLowerCase() || "";
      const symbol = normalizeSymbol(item.symbol);
      const type = item.type || "spot"; // padrão para backward compatibility

      return {
        exchangeId,
        symbol,
        type, // novo campo incluído
        price: parseFloat(item.price || item.lastPrice || item.last || 0),
        liquidity: parseFloat(
          item.quoteVolume ?? item.amount24 ?? item.volume_24h_quote ?? item.volume ?? 0
        )
      };
    });


    lastPrices = formatted;
    return formatted;
  } catch (error) {
    console.error("Erro ao buscar preços das corretoras:", error.message);
    return null;
  }
}

// Função para enviar dados aos clientes
function broadcastData(data) {
  if (!data) return;

  // Log para ver o que está sendo enviado
  console.log(
    `[WebSocket Server broadcastData] Enviando ${data.length} itens. Primeiros 3:`,
    JSON.stringify(data.slice(0, 3))
  );

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
      } catch (error) {
        console.error(
          "Erro ao enviar dados para cliente WebSocket:",
          error.message
        );
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
      broadcastData(prices);
    }
  }, 2000);
}

// Iniciar o servidor WebSocket
wss.on("connection", (ws) => {
  console.log("Cliente WebSocket conectado");
  connectedClients.add(ws);

  // Enviar dados iniciais ao cliente que acabou de se conectar
  if (lastPrices && lastPrices.length > 0) {
    try {
      ws.send(JSON.stringify(lastPrices));
      console.log(
        `Enviados ${lastPrices.length} preços iniciais para o novo cliente`
      );
    } catch (error) {
      console.error(
        "Erro ao enviar dados iniciais para novo cliente:",
        error.message
      );
    }
  }

  // Configurar ping para manter a conexão viva
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("close", () => {
    console.log("Cliente WebSocket desconectado");
    connectedClients.delete(ws);
    clearInterval(pingInterval);
  });

  ws.on("error", (error) => {
    console.error("Erro na conexão WebSocket:", error.message);
    connectedClients.delete(ws);
    clearInterval(pingInterval);
  });
});

// Rota de status do servidor
app.get("/", (req, res) => {
  const clientIP = req.ip;
  console.log(`Acesso à página inicial de ${clientIP}`);
  res.json({
    status: "online",
    websocket: `ws://${req.headers.host}/ws`,
    clients: wss.clients.size,
    connectedIPs: Array.from(connectedClients),
    lastUpdate: lastPrices ? new Date().toISOString() : null,
  });
});

// Rota protegida para dados das criptomoedas
app.get("/api/mexc/prices", auth, async (req, res) => {
  try {
    const prices = await fetchPrices();
    if (prices) {
      res.json(prices);
    } else {
      res.status(503).json({ error: "Serviço temporariamente indisponível" });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Adicione esta rota junto com as outras rotas da API
app.get("/api/mexc/ticker/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log("Buscando dados para o símbolo:", symbol);
    const response = await axios.get(
      "https://api.mexc.com/api/v3/ticker/24hr",
      {
        params: { symbol },
      }
    );
    console.log("Resposta da MEXC:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error(
      "Erro ao buscar dados do ticker:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Erro ao obter dados do ticker" });
  }
});

// Inicialização do servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
  console.log(`WebSocket disponível em ws://0.0.0.0:${PORT}/ws`);
  console.log(
    "Para acessar de outros dispositivos na rede, use o IP da máquina"
  );
  startPriceUpdates();
});

// Tratamento de erros do processo
process.on("uncaughtException", (error) => {
  console.error("Erro não tratado:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Promise rejeitada não tratada:", error);
});

// Limpeza ao encerrar o servidor
process.on("SIGTERM", () => {
  clearInterval(updateInterval);
  server.close(() => {
    console.log("Servidor encerrado");
    process.exit(0);
  });
});
