require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");
const websocketService = require("./services/websocketService");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// 🔹 Conectar ao MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB conectado!"))
  .catch((err) => console.log("❌ Erro ao conectar ao MongoDB:", err));

// 🔹 Middlewares
app.use(cors());
app.use(express.json());

// 🔹 Importação de rotas
const mexcRoutes = require("./routes/mexcRoutes");
const binanceRoutes = require("./routes/binanceRoutes");
const bitgetRoutes = require("./routes/bitgetRoutes");
const gateioRoutes = require("./routes/gateioRoutes");
const kucoinRoutes = require("./routes/kucoinRoutes");
const authRoutes = require("../routes/auth");
const userRoutes = require("../routes/users");

// 🔹 Registro das rotas
app.use("/api/mexc", mexcRoutes);
app.use("/api/binance", binanceRoutes);
app.use("/api/bitget", bitgetRoutes);
app.use("/api/gateio", gateioRoutes);
app.use("/api/kucoin", kucoinRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// 🔹 Rota de teste
app.get("/", (req, res) => {
  res.send("🚀 API funcionando!");
});

console.log("📌 Rotas carregadas no servidor:");
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(`✅ ${r.route.path}`);
  }
});

// 🔹 Configuração do WebSocket para atualizar preços em tempo real
const fetchCryptoPrices = async () => {
  try {
    const response = await axios.get("https://api.mexc.com/api/v3/ticker/24hr");

    if (response.data) {
      const formattedData = response.data.map((crypto) => ({
        symbol: crypto.symbol,
        price: parseFloat(crypto.lastPrice) || 0,
        volume: parseFloat(crypto.volume) || 0,
      }));

      io.emit("cryptoPrices", formattedData); // Enviar para o frontend
    }
  } catch (error) {
    console.error("Erro ao buscar preços da MEXC:", error);
  }
};

// Atualizar preços a cada 2 segundos
setInterval(fetchCryptoPrices, 2000);

io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);
  fetchCryptoPrices();
  socket.on("disconnect", () =>
    console.log("🔴 Cliente desconectado:", socket.id)
  );
});

// Inicializar WebSocket
websocketService.initialize(server);

const wss = new WebSocket.Server({
  server,
  path: "/ws", // Especificando o caminho
});

wss.on("connection", async (ws, req) => {
  console.log("🔌 Nova conexão WebSocket de:", req.socket.remoteAddress);

  // Função para enviar dados para o cliente
  const sendData = (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        // Log detalhado dos dados antes de enviar
        const spotCount = data.filter(
          (i) =>
            i.exchangeName === "MEXC" ||
            (i.exchangeName === "Binance" && !i.symbol.endsWith("PERP"))
        ).length;
        const futuresCount = data.filter(
          (i) => i.exchangeName === "Binance" && i.symbol.endsWith("PERP")
        ).length;

        console.log(
          `Enviando dados: ${spotCount} spot, ${futuresCount} futures`
        );
        console.log(
          "Exemplos spot:",
          data
            .filter(
              (i) =>
                i.exchangeName === "MEXC" ||
                (i.exchangeName === "Binance" && !i.symbol.endsWith("PERP"))
            )
            .slice(0, 2)
        );
        console.log(
          "Exemplos futures:",
          data
            .filter(
              (i) => i.exchangeName === "Binance" && i.symbol.endsWith("PERP")
            )
            .slice(0, 2)
        );

        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error("❌ Erro ao enviar dados:", error);
      }
    }
  };

  // Enviar dados iniciais quando disponíveis
  if (latestPrices && latestPrices.length > 0) {
    sendData(latestPrices);
  }

  ws.on("error", (error) => {
    console.error("❌ Erro no WebSocket:", error);
  });

  ws.on("close", () => {
    console.log("👋 Conexão WebSocket fechada");
  });
});

// 🔹 Inicialização do servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
  console.log(`WebSocket disponível em ws://0.0.0.0:${PORT}/ws`);
});
