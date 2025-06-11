// binanceRoutes.js adaptado para usar ScraperAPI como proxy intermediário
const express = require("express");
const axios = require("axios");
const exchangeFees = require("../config/exchangeFees");

const router = express.Router();
const BINANCE_API_URL = "https://api.binance.com/api/v3";
const BINANCE_FUTURES_API_URL = "https://fapi.binance.com/fapi/v1";

router.get("/", (req, res) => {
  res.json({
    message: "API da Binance funcionando! Use /spot/prices ou /futures/prices.",
  });
});

// Preços Spot
router.get("/spot/prices", async (req, res) => {
  try {
    const response = await axios.get(`${BINANCE_API_URL}/ticker/price`);

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

// Preços Futures
router.get("/futures/prices", async (req, res) => {
  try {
    const [priceResponse, bookResponse] = await Promise.all([
      axios.get(`${BINANCE_FUTURES_API_URL}/ticker/price`),
      axios.get(`${BINANCE_FUTURES_API_URL}/ticker/24hr`)
    ]);

    const prices = priceResponse.data;
    const books = bookResponse.data;

    const enrichedData = prices.map((price) => {
      const bookData = books.find((b) => b.symbol === price.symbol) || {};
      return {
        symbol: price.symbol,
        price: price.price,
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
    console.error("❌ Erro ao buscar preços Futures da Binance:", error.message);
    res.status(500).json({ error: "Erro ao obter preços Futures da Binance" });
  }
});

// Taxas gerais
router.get("/fees", (req, res) => {
  try {
    res.json(exchangeFees.binance);
  } catch (error) {
    console.error("❌ Erro ao buscar taxas da Binance:", error.message);
    res.status(500).json({ error: "Erro ao obter taxas da Binance" });
  }
});

// Taxas por tipo
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

// Ticker específico
router.get("/ticker/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get(`${BINANCE_API_URL}/ticker/24hr?symbol=${symbol}`);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro ao buscar dados do ticker:", error.message);
    res.status(500).json({ error: "Erro ao obter dados do ticker" });
  }
});

// Endpoint de debug
router.get("/debug/binance", async (req, res) => {
  try {
    const r = await axios.get(`${BINANCE_API_URL}/ticker/price`);
    res.status(200).json({ status: "ok", count: r.data.length });
  } catch (err) {
    console.error("Erro de rede Binance:", err.message);
    res.status(500).json({ status: "fail", message: err.message });
  }
});

module.exports = router;
