const express = require("express");
const axios = require("axios");

const router = express.Router();
const GATEIO_API_URL = "https://api.gateio.ws/api/v4/spot";
const GATEIO_FUTURES_API_URL = "https://api.gateio.ws/api/v4/futures/usdt";

// 🔹 Recuperando as chaves de API da Gate.io
const gateioAPIKey = process.env.GATEIO_API_KEY;
const gateioSecretKey = process.env.GATEIO_SECRET_KEY;

// 🔹 Teste da API Gate.io
router.get("/", (req, res) => {
  res.json({
    message: "API da Gate.io funcionando! Use /spot/prices ou /futures/prices.",
  });
});

// 🔹 Preços Spot
router.get("/spot/prices", async (req, res) => {
  try {
    console.log("🔍 Tentando acessar a API do Gate.io...");
    const response = await axios.get(`${GATEIO_API_URL}/tickers`, {
      timeout: 10000, // 10 segundos de timeout
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gateioAPIKey}`, // Adicionando a chave de API aqui
      },
    });
    console.log("✅ Resposta recebida do Gate.io:", response.status);

    if (response.data && Array.isArray(response.data)) {
      // Transformar os dados para o formato padrão usado pela aplicação
      const formattedData = response.data.map((item) => ({
        symbol: item.currency_pair,
        price: item.last || "0",
        volume: item.base_volume || item.quote_volume || "0",
        exchangeId: "gateio",
        exchangeName: "Gate.io",
      }));

      console.log(
        `✅ Processados ${formattedData.length} pares de moedas do Gate.io`
      );
      res.json(formattedData);
    } else {
      console.error(
        "❌ Dados inválidos recebidos da API Spot Gate.io:",
        Array.isArray(response.data)
          ? `Array vazio`
          : `Não é um array: ${typeof response.data}`
      );
      throw new Error("Dados inválidos recebidos da API Spot Gate.io");
    }
  } catch (error) {
    console.error("❌ Erro ao buscar preços Spot do Gate.io:", error.message);

    if (error.response) {
      console.error("🔍 Detalhes do erro:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    res.status(500).json({ error: "Erro ao obter preços Spot do Gate.io" });
  }
});

// 🔹 Preços Futures
router.get("/futures/prices", async (req, res) => {
  try {
    const response = await axios.get(`${GATEIO_FUTURES_API_URL}/tickers`, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gateioAPIKey}`, // Adicionando a chave de API aqui
      },
    });

    if (response.data && Array.isArray(response.data)) {
      // Normalizar os dados para o formato padrão esperado pelo frontend
      const formattedData = response.data.map((item) => ({
        symbol: item.contract, // nome do contrato future
        price: item.last || "0",
        lastPrice: item.last || "0", // <-- Adicione esta linha!
        quoteVolume: item.volume_24h_quote || "0", // volume em USD
        volume: item.volume_24h || "0", // volume em moeda base
        exchangeId: "gateio",
        exchangeName: "Gate.io Futures",
        type: "futures",
      }));

      res.json(formattedData);
    } else {
      res.status(500).json({ error: "Dados inválidos recebidos da API Futures Gate.io" });
    }
  } catch (error) {
    console.error(
      "❌ Erro ao buscar preços Futures da Gate.io:",
      error.message
    );
    res.status(500).json({ error: "Erro ao obter preços Futures da Gate.io" });
  }
});

// 🔹 Dados detalhados de um ticker específico
router.get("/ticker/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log("🔍 Buscando dados da Gate.io para o símbolo:", symbol);

    // O Gate.io usa 'currency_pair' como parâmetro, e o formato é diferente (BTC_USDT)
    // Vamos tentar fazer a consulta diretamente com o símbolo recebido
    const response = await axios.get(`${GATEIO_API_URL}/tickers`, {
      params: { currency_pair: symbol },
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gateioAPIKey}`, // Adicionando a chave de API aqui
      },
    });

    console.log("✅ Resposta de ticker da Gate.io recebida:", response.status);

    if (
      response.data &&
      Array.isArray(response.data) &&
      response.data.length > 0
    ) {
      // Pegar o primeiro item dos dados recebidos
      const tickerData = response.data[0];

      // Obter dados adicionais para complementar
      let additionalData = {};
      try {
        const candlesResponse = await axios.get(
          `${GATEIO_API_URL}/candlesticks`,
          {
            params: {
              currency_pair: symbol,
              limit: 1,
              interval: "1d",
            },
            timeout: 5000,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "Authorization": `Bearer ${gateioAPIKey}`, // Adicionando a chave de API aqui
            },
          }
        );

        if (
          candlesResponse.data &&
          Array.isArray(candlesResponse.data) &&
          candlesResponse.data.length > 0
        ) {
          const candle = candlesResponse.data[0];
          additionalData = {
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
          };
        }
      } catch (candleError) {
        console.warn(
          "⚠️ Não foi possível obter dados de velas:",
          candleError.message
        );
      }

      // Combinar os dados
      const enrichedData = {
        ...tickerData,
        ...additionalData,
        symbol,
        // Garantir campos necessários para o frontend
        lastPrice: tickerData.last || tickerData.close || "0",
        highPrice: tickerData.high_24h || additionalData.high || "0",
        lowPrice: tickerData.low_24h || additionalData.low || "0",
        volume: tickerData.base_volume || additionalData.volume || "0",
        quoteVolume: tickerData.quote_volume || "0",
      };

      console.log("✅ Dados enriquecidos de ticker da Gate.io:", {
        symbol,
        enrichedDataKeys: Object.keys(enrichedData),
      });

      res.json(enrichedData);
    } else {
      console.error(
        "❌ Dados inválidos recebidos da API de ticker da Gate.io:",
        response.data
          ? JSON.stringify(response.data).substr(0, 200)
          : "Sem dados"
      );
      throw new Error("Dados inválidos recebidos do ticker Gate.io");
    }
  } catch (error) {
    console.error(
      "❌ Erro ao buscar dados do ticker da Gate.io:",
      error.message
    );

    if (error.response) {
      // Se o erro for de resposta (404, 500, etc)
      console.error("🔍 Detalhes do erro:", {
        status: error.response.status,
        data: error.response.data,
      });

      if (error.response.status === 404) {
        return res.status(404).json({
          error: `Símbolo '${req.params.symbol}' não encontrado na Gate.io`,
        });
      }
    }

    // Erro genérico
    res.status(500).json({ error: "Erro ao obter dados de ticker da Gate.io" });
  }
});

module.exports = router;
