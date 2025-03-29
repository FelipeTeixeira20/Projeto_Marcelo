const WebSocket = require("ws");
const axios = require("axios");

class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.exchangeWs = new Map();
    this.lastPrices = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    console.log("🔌 Servidor WebSocket iniciado");

    this.wss.on("connection", (ws) => {
      console.log("👤 Nova conexão WebSocket estabelecida");

      // Identificador único para cada conexão
      const connectionId = Date.now().toString();
      this.connections.set(connectionId, ws);

      // Enviar dados iniciais
      this.sendInitialData(ws);

      // Configurar atualização periódica
      const updateInterval = setInterval(() => {
        this.updatePrices(ws);
      }, 1000);

      ws.on("error", (error) => {
        console.error("❌ Erro no WebSocket:", error);
      });

      ws.on("close", () => {
        console.log("👋 Conexão WebSocket fechada");
        this.connections.delete(connectionId);
        clearInterval(updateInterval);
      });
    });

    // Iniciar conexões WebSocket com as exchanges
    this.connectToExchanges();
  }

  async connectToExchanges() {
    // Binance
    const binanceWs = new WebSocket(
      "wss://stream.binance.com:9443/ws/!ticker@arr"
    );
    binanceWs.on("message", (data) => {
      const prices = JSON.parse(data);
      prices.forEach((ticker) => {
        this.lastPrices.set(`binance_${ticker.s}`, {
          symbol: ticker.s,
          price: ticker.c,
          exchange: "binance",
        });
      });
    });
    this.exchangeWs.set("binance", binanceWs);

    // Adicionar outras exchanges conforme necessário
  }

  async sendInitialData(ws) {
    try {
      const [binanceSpot, binanceFutures] = await Promise.all([
        axios.get("http://localhost:5000/api/binance/spot/prices"),
        axios.get("http://localhost:5000/api/binance/futures/prices"),
      ]);

      const initialData = {
        type: "initial",
        data: {
          binance: {
            spot: binanceSpot.data,
            futures: binanceFutures.data,
          },
        },
      };

      ws.send(JSON.stringify(initialData));
    } catch (error) {
      console.error("Erro ao buscar dados iniciais:", error);
    }
  }

  async updatePrices(ws) {
    if (ws.readyState === WebSocket.OPEN) {
      const updates = Array.from(this.lastPrices.values());
      ws.send(JSON.stringify({ type: "update", data: updates }));
    }
  }

  broadcast(data) {
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }
}

module.exports = new WebSocketService();
