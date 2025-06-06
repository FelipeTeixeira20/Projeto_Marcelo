const express = require("express");
const axios = require("axios");
const exchangeFees = require("../config/exchangeFees");

const router = express.Router();
const BINANCE_API_URL = "https://api.binance.com/api/v3";
const BINANCE_FUTURES_API_URL = "https://fapi.binance.com/fapi/v1";

// 🔹 Recuperando a chave da API e Secret da Binance
const binanceAPIKey = process.env.BINANCE_API_KEY;
const binanceSecretKey = process.env.BINANCE_SECRET_KEY;

// 🔹 Teste da API Binance
router.get("/", (req, res) => {
  res.json({
    message: "API da Binance funcionando! Use /spot/prices ou /futures/prices.",
  });
});

// 🔹 Preços Spot
router.get("/spot/prices", async (req, res) => {
  try {
    const response = await axios.get(`${BINANCE_API_URL}/ticker/price`, {
      headers: {
        'X-MBX-APIKEY': binanceAPIKey, // Incluindo a chave da API
      },
    });

    // Filtrar apenas os pares contra USDT
    const filtered = response.data
      .filter(item => item.symbol.endsWith("USDT"))
      .map(item => ({
        symbol: item.symbol,
        price: parseFloat(item.price),
        exchangeId: "binance",
        type: "spot"
      }));

    res.json(filtered);
  } catch (error) {
    console.error("❌ Erro ao buscar preços Spot da Binance:", error.message);
    res.status(500).json({ error: "Erro ao obter preços Spot da Binance" });
  }
});

// 🔹 Taxas
router.get("/fees", (req, res) => {
  try {
    res.json(exchangeFees.binance);
  } catch (error) {
    console.error("❌ Erro ao buscar taxas da Binance:", error.message);
    res.status(500).json({ error: "Erro ao obter taxas da Binance" });
  }
});

// 🔹 Taxas específicas (spot ou futures)
router.get("/fees/:type", (req, res) => {
  const { type } = req.params;
  try {
    if (type !== "spot" && type !== "futures") {
      throw new Error("Tipo inválido");
    }
    res.json(exchangeFees.binance[type]);
  } catch (error) {
    console.error(`❌ Erro ao buscar taxas ${type} da Binance:`, error.message);
    res.status(500).json({ error: `Erro ao obter taxas ${type} da Binance` });
  }
});

// 🔹 Preços Futures
router.get("/futures/prices", async (req, res) => {
  try {
    const [priceResponse, bookResponse] = await Promise.all([
      axios.get(`${BINANCE_FUTURES_API_URL}/ticker/price`, {
        headers: {
          'X-MBX-APIKEY': binanceAPIKey, // Incluindo a chave da API
        },
      }),
      axios.get(`${BINANCE_FUTURES_API_URL}/ticker/24hr`, {
        headers: {
          'X-MBX-APIKEY': binanceAPIKey, // Incluindo a chave da API
        },
      }),
    ]);

    const prices = priceResponse.data;
    const books = bookResponse.data;

    const enrichedData = prices.map((price) => {
      const bookData = books.find((b) => b.symbol === price.symbol) || {};
      return {
        symbol: price.symbol,
        price: price.price,               // preço atual real
        volume: bookData.volume || "0",
        quoteVolume: bookData.quoteVolume || "0",
        openPrice: bookData.openPrice || "0",
        highPrice: bookData.highPrice || "0",
        lowPrice: bookData.lowPrice || "0",
        priceChangePercent: bookData.priceChangePercent || "0",
        lastPrice: bookData.lastPrice || price.price,
        exchangeId: "binance",
        exchangeName: "Binance",
      };
    });
    res.json(enrichedData);
  } catch (error) {
    console.error(
      "❌ Erro ao buscar preços Futures da Binance:",
      error.message
    );
    res.status(500).json({ error: "Erro ao obter preços Futures da Binance" });
  }
});

// 🔹 Ticker de um símbolo específico
router.get("/ticker/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log("🔍 Buscando dados para:", symbol);
    const response = await axios.get(`${BINANCE_API_URL}/ticker/24hr`, {
      params: { symbol },
      headers: {
        'X-MBX-APIKEY': binanceAPIKey, // Incluindo a chave da API
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro ao buscar dados do ticker:", error.message);
    res.status(500).json({ error: "Erro ao obter dados do ticker" });
  }
});

module.exports = router;
