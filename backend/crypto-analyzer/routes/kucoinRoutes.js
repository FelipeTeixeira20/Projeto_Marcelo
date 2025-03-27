const express = require("express");
const axios = require("axios");

const router = express.Router();
const KUCOIN_API_URL = "https://api.kucoin.com/api/v1";
const KUCOIN_FUTURES_API_URL = "https://api-futures.kucoin.com/api/v1";

// 🔹 Teste da API KuCoin
router.get("/", (req, res) => {
  res.json({
    message: "API da KuCoin funcionando! Use /spot/prices ou /futures/prices.",
  });
});

// 🔹 Preços Spot
router.get("/spot/prices", async (req, res) => {
  try {
    console.log("🔍 Tentando acessar a API da KuCoin...");
    const response = await axios.get(`${KUCOIN_API_URL}/market/allTickers`, {
      timeout: 10000, // 10 segundos de timeout
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    console.log("✅ Resposta recebida da KuCoin:", response.status);

    if (
      response.data &&
      response.data.data &&
      Array.isArray(response.data.data.ticker)
    ) {
      // Transformar os dados para o formato padrão usado pela aplicação
      const formattedData = response.data.data.ticker.map((item) => ({
        symbol: item.symbol,
        price: item.last || "0",
        volume: item.vol || item.volValue || "0",
        exchangeId: "kucoin",
        exchangeName: "KuCoin",
      }));

      console.log(
        `✅ Processados ${formattedData.length} pares de moedas da KuCoin`
      );
      res.json(formattedData);
    } else {
      console.error(
        "❌ Dados inválidos recebidos da API Spot KuCoin:",
        response.data
          ? `Estrutura inesperada: ${JSON.stringify(response.data).slice(
              0,
              200
            )}...`
          : "Sem dados"
      );
      throw new Error("Dados inválidos recebidos da API Spot KuCoin");
    }
  } catch (error) {
    console.error("❌ Erro ao buscar preços Spot da KuCoin:", error.message);

    if (error.response) {
      console.error("🔍 Detalhes do erro:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    res.status(500).json({ error: "Erro ao obter preços Spot da KuCoin" });
  }
});

// 🔹 Preços Futures
router.get("/futures/prices", async (req, res) => {
  try {
    console.log("🔍 Tentando acessar a API de Futuros da KuCoin...");
    const response = await axios.get(
      `${KUCOIN_FUTURES_API_URL}/contracts/active`,
      {
        timeout: 10000, // 10 segundos de timeout
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    console.log(
      "✅ Resposta recebida da API de Futuros KuCoin:",
      response.status
    );

    if (
      response.data &&
      response.data.data &&
      Array.isArray(response.data.data)
    ) {
      // Transformar os dados para o formato padrão usado pela aplicação
      const formattedData = response.data.data.map((item) => ({
        symbol: item.symbol,
        price: item.markPrice || item.lastTradePrice || "0",
        volume: item.volume24h || item.turnover24h || "0",
        exchangeId: "kucoin",
        exchangeName: "KuCoin Futures",
      }));

      console.log(
        `✅ Processados ${formattedData.length} contratos de futuros da KuCoin`
      );
      res.json(formattedData);
    } else {
      console.error(
        "❌ Dados inválidos recebidos da API Futures KuCoin:",
        response.data
          ? `Estrutura inesperada: ${JSON.stringify(response.data).slice(
              0,
              200
            )}...`
          : "Sem dados"
      );
      throw new Error("Dados inválidos recebidos da API Futures KuCoin");
    }
  } catch (error) {
    console.error("❌ Erro ao buscar preços Futures da KuCoin:", error.message);

    if (error.response) {
      console.error("🔍 Detalhes do erro:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    res.status(500).json({ error: "Erro ao obter preços Futures da KuCoin" });
  }
});

// 🔹 Dados detalhados de um ticker específico
router.get("/ticker/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log("🔍 Buscando dados da KuCoin para o símbolo:", symbol);

    // KuCoin usa o formato de símbolo com hífen (BTC-USDT)
    // Vamos garantir que o formato esteja correto
    let kucoinSymbol = symbol;

    // Se não tiver hífen e contiver USDT, formatamos como XXX-USDT
    if (!symbol.includes("-")) {
      if (symbol.includes("USDT")) {
        kucoinSymbol = symbol.replace("USDT", "-USDT");
      } else if (symbol.includes("BTC")) {
        kucoinSymbol = symbol.replace("BTC", "-BTC");
      } else if (symbol.includes("ETH")) {
        kucoinSymbol = symbol.replace("ETH", "-ETH");
      }
    }

    console.log("🔍 Símbolo formatado para KuCoin:", kucoinSymbol);

    // Verificar se o símbolo existe na KuCoin consultando a lista de símbolos
    console.log("🔍 Verificando se o símbolo existe na KuCoin...");
    let symbolExists = false;

    try {
      const symbolsResponse = await axios.get(`${KUCOIN_API_URL}/symbols`, {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (symbolsResponse.data && symbolsResponse.data.data) {
        // Verificar se o símbolo existe na lista
        const symbols = symbolsResponse.data.data.map((item) => item.symbol);
        symbolExists = symbols.includes(kucoinSymbol);

        // Tentar também o símbolo original
        if (!symbolExists) {
          symbolExists = symbols.includes(symbol);
          if (symbolExists) {
            kucoinSymbol = symbol; // Usar o símbolo original
          }
        }

        // Verificar outros formatos possíveis
        if (!symbolExists) {
          // Tenta inverter formato (ex: BTC-USDT -> USDT-BTC)
          let parts = kucoinSymbol.split("-");
          if (parts.length === 2) {
            let reversedSymbol = `${parts[1]}-${parts[0]}`;
            if (symbols.includes(reversedSymbol)) {
              kucoinSymbol = reversedSymbol;
              symbolExists = true;
            }
          }
        }

        console.log(
          `✅ Exemplos de símbolos disponíveis na KuCoin: ${symbols
            .slice(0, 5)
            .join(", ")}...`
        );
        console.log(
          `🔍 Símbolo ${kucoinSymbol} existe na KuCoin: ${symbolExists}`
        );
      }
    } catch (symbolsError) {
      console.warn(
        "⚠️ Erro ao buscar símbolos da KuCoin:",
        symbolsError.message
      );
    }

    // Se o símbolo não existe, retornar um erro 404
    if (!symbolExists) {
      return res.status(404).json({
        error: `Símbolo '${symbol}' não encontrado na KuCoin. A KuCoin usa o formato BTC-USDT com hífen. Tente outro formato.`,
      });
    }

    // Agora tente obter os dados usando o símbolo correto
    console.log(`🔍 Buscando ticker para ${kucoinSymbol}...`);
    const response = await axios.get(`${KUCOIN_API_URL}/market/stats`, {
      params: { symbol: kucoinSymbol },
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    console.log(
      "✅ Resposta de estatísticas da KuCoin recebida:",
      response.status
    );

    if (response.data && response.data.data) {
      // Obter os dados do ticker
      const statsData = response.data.data;

      // Tentar obter dados adicionais do ticker para complementar
      let tickerData = {};
      try {
        const tickerResponse = await axios.get(
          `${KUCOIN_API_URL}/market/orderbook/level1`,
          {
            params: { symbol: kucoinSymbol },
            timeout: 5000,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        if (tickerResponse.data && tickerResponse.data.data) {
          tickerData = tickerResponse.data.data;
        }
      } catch (tickerError) {
        console.warn(
          "⚠️ Não foi possível obter dados de ticker:",
          tickerError.message
        );
      }

      // Combinar os dados
      const enrichedData = {
        ...statsData,
        ...tickerData,
        symbol,
        // Garantir campos necessários para o frontend
        lastPrice: statsData.last || tickerData.price || "0",
        highPrice: statsData.high || "0",
        lowPrice: statsData.low || "0",
        volume: statsData.vol || statsData.volume || "0",
        quoteVolume: statsData.volValue || statsData.quoteVolume || "0",
        changeRate: statsData.changeRate || "0",
        changePrice: statsData.changePrice || "0",
        // KuCoin específico
        buy: statsData.buy || tickerData.bestBid || "0",
        sell: statsData.sell || tickerData.bestAsk || "0",
      };

      console.log("✅ Dados enriquecidos da KuCoin:", {
        symbol,
        enrichedDataKeys: Object.keys(enrichedData),
      });

      res.json(enrichedData);
    } else {
      console.error(
        "❌ Dados inválidos recebidos da API da KuCoin:",
        response.data
          ? JSON.stringify(response.data).substr(0, 200)
          : "Sem dados"
      );
      throw new Error("Dados inválidos recebidos da KuCoin");
    }
  } catch (error) {
    console.error(
      "❌ Erro ao buscar dados do ticker da KuCoin:",
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
          error: `Símbolo '${req.params.symbol}' não encontrado na KuCoin. A KuCoin usa o formato BTC-USDT com hífen.`,
        });
      }
    }

    // Erro genérico
    res.status(500).json({ error: "Erro ao obter dados de ticker da KuCoin" });
  }
});

module.exports = router;
