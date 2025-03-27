const express = require("express");
const axios = require("axios");

const router = express.Router();
const BITGET_API_URL = "https://api.bitget.com/api/spot/v1";
const BITGET_FUTURES_API_URL = "https://api.bitget.com/api/mix/v1";

// 🔹 Teste da API Bitget
router.get("/", (req, res) => {
  res.json({
    message: "API da Bitget funcionando! Use /spot/prices ou /futures/prices.",
  });
});

// 🔹 Preços Spot
router.get("/spot/prices", async (req, res) => {
  try {
    console.log("🔍 Tentando acessar a API da Bitget...");
    const response = await axios.get(`${BITGET_API_URL}/market/tickers`, {
      timeout: 10000, // 10 segundos de timeout
    });
    console.log("✅ Resposta recebida da Bitget:", response.status);

    if (response.data && response.data.data) {
      // Transformar os dados para o formato padrão usado pela aplicação
      const formattedData = response.data.data.map((item) => ({
        symbol: item.symbol,
        price: item.close || item.last || "0",
        volume: item.baseVolume || item.quoteVolume || "0",
        exchangeId: "bitget",
        exchangeName: "Bitget",
      }));

      res.json(formattedData);
    } else {
      console.error(
        "❌ Dados inválidos recebidos da API Spot Bitget:",
        response.data
      );
      throw new Error("Dados inválidos recebidos da API Spot");
    }
  } catch (error) {
    console.error("❌ Erro ao buscar preços Spot da Bitget:", error.message);

    if (error.response) {
      console.error("🔍 Detalhes do erro:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    res.status(500).json({ error: "Erro ao obter preços Spot da Bitget" });
  }
});

// 🔹 Dados detalhados de um ticker específico
router.get("/ticker/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log("🔍 Buscando dados da Bitget para o símbolo:", symbol);

    // Na API da Bitget, alguns símbolos precisam do sufixo _SPBL
    // Vamos verificar se o symbol já tem esse sufixo, caso não tenha, adicionamos
    let bitgetSymbol = symbol;
    if (!symbol.includes("_SPBL")) {
      bitgetSymbol = `${symbol}_SPBL`;
    }
    console.log("🔍 Símbolo formatado para Bitget:", bitgetSymbol);

    // Tentando obter os dados dos produtos primeiro para verificar se o símbolo existe
    console.log("🔍 Verificando se o símbolo existe na Bitget...");
    let symbolExists = false;

    try {
      const productsResponse = await axios.get(
        `${BITGET_API_URL}/public/products`,
        {
          timeout: 10000,
        }
      );

      if (productsResponse.data && productsResponse.data.data) {
        // Verificar se o símbolo existe na lista de produtos
        const symbols = productsResponse.data.data.map((item) => item.symbol);
        symbolExists = symbols.includes(bitgetSymbol);

        // Verificar também com o símbolo original
        if (!symbolExists) {
          symbolExists = symbols.includes(symbol);
          if (symbolExists) {
            bitgetSymbol = symbol; // Usar o símbolo original
          }
        }

        console.log(
          `✅ Símbolos disponíveis na Bitget: ${symbols
            .slice(0, 5)
            .join(", ")}...`
        );
        console.log(
          `🔍 Símbolo ${bitgetSymbol} existe na Bitget: ${symbolExists}`
        );
      }
    } catch (productsError) {
      console.warn(
        "⚠️ Erro ao buscar produtos da Bitget:",
        productsError.message
      );
    }

    // Se o símbolo não existir, retornar um erro 404
    if (!symbolExists) {
      return res.status(404).json({
        error: `Símbolo '${symbol}' não encontrado na Bitget. Tente outro formato como ${symbol.replace(
          "-",
          ""
        )}.`,
      });
    }

    // Agora, tente obter os dados usando o símbolo correto
    console.log(`🔍 Buscando ticker para ${bitgetSymbol}...`);
    const response = await axios.get(`${BITGET_API_URL}/market/ticker`, {
      params: { symbol: bitgetSymbol },
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Resposta de ticker da Bitget recebida:", response.status);

    if (response.data && response.data.data) {
      // Normalizando os dados recebidos
      const tickerData = response.data.data;

      // Obter dados adicionais de candle para ter mais informações se necessário
      let additionalData = {};
      try {
        const candleResponse = await axios.get(
          `${BITGET_API_URL}/market/candles`,
          {
            params: {
              symbol: bitgetSymbol,
              period: "1day",
              limit: 1,
            },
            timeout: 5000,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        if (
          candleResponse.data &&
          candleResponse.data.data &&
          candleResponse.data.data.length > 0
        ) {
          additionalData = candleResponse.data.data[0];
        }
      } catch (candleError) {
        console.warn(
          "⚠️ Não foi possível obter dados de candle:",
          candleError.message
        );
      }

      // Combinar os dados
      const enrichedData = {
        ...tickerData,
        symbol,
        // Garantir campos necessários para o frontend usando os dados disponíveis
        lastPrice: tickerData.close || "0",
        highPrice: tickerData.high24h || additionalData.high || "0",
        lowPrice: tickerData.low24h || additionalData.low || "0",
        volume: tickerData.baseVol || additionalData.baseVol || "0",
        quoteVolume: tickerData.quoteVol || additionalData.quoteVol || "0",
        change: tickerData.change || "0",
        changeRate: tickerData.changeUtc || "0",
      };

      console.log("✅ Dados enriquecidos de ticker da Bitget:", {
        symbol,
        enrichedDataKeys: Object.keys(enrichedData),
      });

      res.json(enrichedData);
    } else {
      console.error(
        "❌ Dados inválidos recebidos da API de ticker da Bitget:",
        response.data
          ? JSON.stringify(response.data).substr(0, 200)
          : "Sem dados"
      );
      throw new Error("Dados inválidos recebidos do ticker Bitget");
    }
  } catch (error) {
    console.error(
      "❌ Erro ao buscar dados do ticker da Bitget:",
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
          error: `Símbolo '${req.params.symbol}' não encontrado na Bitget. Tente outro formato.`,
        });
      }
    }

    // Erro genérico
    res.status(500).json({ error: "Erro ao obter dados de ticker da Bitget" });
  }
});

// 🔹 Preços Futures (Corrigido)
router.get("/futures/prices", async (req, res) => {
  try {
    const response = await axios.get(
      `${BITGET_FUTURES_API_URL}/market/tickers?productType=umcbl`
    );
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      throw new Error("Dados inválidos recebidos da API Futures");
    }
  } catch (error) {
    console.error("❌ Erro ao buscar preços Futures da Bitget:", error.message);
    res.status(500).json({ error: "Erro ao obter preços Futures da Bitget" });
  }
});

module.exports = router;
