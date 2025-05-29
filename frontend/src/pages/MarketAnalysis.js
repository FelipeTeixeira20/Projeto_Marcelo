import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Layout from "../components/Layout";
import CryptoBackground from "../components/CryptoBackground";
import axios from "axios";
import "./MarketAnalysis.css";
import { debounce } from "lodash";
import { motion, AnimatePresence } from "framer-motion";

const SERVER_URL =
  window.location.hostname === "192.168.100.26"
    ? "192.168.100.26"
    : window.location.hostname;

const EXCHANGES = ["binance", "mexc", "bitget", "gateio", "kucoin"];
const BATCH_SIZE = 50; // Número de oportunidades mostradas por vez
const MIN_PROFIT = 0.001; // Lucro mínimo para mostrar oportunidade

const cleanFuturesSymbol = (exchange, symbol) => {
  if (!symbol) return "";

  if (exchange === "gateio" || exchange === "bitget") {
    return symbol
      .replace(/_UMCBL$/, "")
      .replace(/_DMCBL$/, "")
      .replace(/_CMCBL$/, "");
  }

  if (exchange === "kucoin") {
    return symbol.endsWith("M") ? symbol.slice(0, -1) : symbol;
  }

  return symbol;
};

const MarketAnalysis = () => {
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState(new Set());
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState(["binance"]); // Começa apenas com Binance
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);
  const lastUpdateTime = useRef(new Map());

  // Função para normalizar símbolos (memoizada)
  const normalizeSymbol = useMemo(() => {
    const symbolCache = new Map();
    return (symbol) => {
      if (!symbol) return "";
      if (symbolCache.has(symbol)) return symbolCache.get(symbol);

      let normalized = symbol.toString().replace(/[-_]/g, "").toUpperCase();
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

      for (const stablecoin of stablecoins) {
        if (normalized.endsWith(stablecoin)) {
          normalized = normalized.replace(stablecoin, "USDT");
          symbolCache.set(symbol, normalized);
          return normalized;
        }
      }

      symbolCache.set(symbol, normalized);
      return normalized;
    };
  }, []);

  // Função para calcular o lucro (memoizada)
  const calculateProfit = useMemo(() => {
    return (price1, price2) => {
      if (!price1 || !price2) return 0;
      return (Math.max(price1, price2) / Math.min(price1, price2) - 1) * 100;
    };
  }, []);

  // Função para processar dados do WebSocket de forma otimizada
  const processWebSocketUpdate = useCallback(
    (data) => {
      console.log(
        "[MarketAnalysis processWebSocketUpdate] Função chamada com dados:",
        data && data.length > 0 ? data.slice(0, 2) : data
      ); // Log no início da função
      const now = Date.now();
      const updates = new Map();

      data.forEach((update) => {
        const normalizeExchange = (raw) => {
          const key = raw?.toLowerCase();
          if (key.includes("binance")) return "binance";
          if (key.includes("mexc")) return "mexc";
          if (key.includes("bitget")) return "bitget";
          if (key.includes("kucoin")) return "kucoin";
          if (key.includes("gateio")) return "gateio";
          return key;
        };
        const exchangeKey = normalizeExchange(
          update.exchangeId || update.exchangeName || update.exchange || ""
        );

        const symbolKey = normalizeSymbol(update.symbol);
        const key = `${exchangeKey}-${symbolKey}-${update.type ?? "spot"}`;

        updates.set(key, {
          price: parseFloat(update.price),
          liquidity: parseFloat(update.liquidity ?? 0),
          timestamp: now,
        });
      });

      setOpportunities((prevOpps) => {
        let hasChangedOverall = false;
        const updatedOpps = prevOpps.map((opp) => {
          const baseKey = (exchange, symbol, type) =>
            `${exchange.toLowerCase()}-${normalizeSymbol(symbol)}-${type}`;

          let key1, key2;

          if (opp.type === "spot-futures" && opp.exchange1 === opp.exchange2) {
            key1 = baseKey(opp.exchange1, opp.symbol, "spot");
            key2 = baseKey(opp.exchange2, cleanFuturesSymbol(opp.exchange2, opp.symbol), "futures");
          } else {
            key1 = baseKey(opp.exchange1, opp.symbol, "spot");
            key2 = baseKey(opp.exchange2, opp.symbol, "spot");
          }

          const update1 = updates.get(key1);
          const update2 = updates.get(key2);

          if (!update1 && !update2) return opp;

          const newPrice1 = update1 ? update1.price : opp.price1;
          const newPrice2 = update2 ? update2.price : opp.price2;

          let newProfit = opp.profit;
          if (
            (update1 && newPrice1 !== opp.price1) ||
            (update2 && newPrice2 !== opp.price2)
          ) {
            newProfit = calculateProfit(newPrice1, newPrice2);
          }

          const liquidity1 = update1?.liquidity ?? opp.liquidity1;
          const liquidity2 = update2?.liquidity ?? opp.liquidity2;

          const pricesChanged =
            newPrice1 !== opp.price1 || newPrice2 !== opp.price2;
          const liquidityChanged =
            liquidity1 !== opp.liquidity1 || liquidity2 !== opp.liquidity2;

          if (pricesChanged || liquidityChanged) {
            lastUpdateTime.current.set(opp.id, now);
            hasChangedOverall = true;

            return {
              ...opp,
              price1: newPrice1,
              price2: newPrice2,
              liquidity1,
              liquidity2,
              profit: newProfit,
              timestamp: now,
            };
          }
          return opp;
        });

        return hasChangedOverall ? updatedOpps : prevOpps;
      });
    },
    [normalizeSymbol, calculateProfit, setOpportunities, setRecentlyUpdatedIds]
  );

  const processWebSocketUpdateRef = useRef(processWebSocketUpdate); // Agora pode ser inicializada diretamente

  const getLiquidityValue = (exchange, item) => {
    if (!item) return 0;

    switch (exchange) {
      case "binance":
      case "bitget":
        return parseFloat(item.quoteVolume ?? 0);
      case "mexc":
        return parseFloat(item.amount24 ?? 0);
      case "gateio":
        return parseFloat(item.volume_24h_quote ?? 0);
      case "kucoin":
        // Se for futures da KuCoin, o campo é quoteVolume (igual ao bitget/binance)
        return parseFloat(item.quoteVolume ?? item.volume ?? 0);
      default:
        return 0;
    }
  };

  // Filtragem de oportunidades otimizada
  const filteredOpportunities = useMemo(() => {
    if (!searchTerm && selectedExchanges.length === 0) return [];

    return opportunities
      .filter((opp) => {
        const normalizedSearch = normalizeSymbol(searchTerm);
        const normalizedSymbol = normalizeSymbol(opp.symbol);

        const matchesSearch =
          !searchTerm || normalizedSymbol.includes(normalizedSearch);

        const matchesExchanges =
          selectedExchanges.includes(opp.exchange1) ||
          selectedExchanges.includes(opp.exchange2);

        return matchesSearch && matchesExchanges;
      })
      .slice(0, visibleCount);
  }, [
    opportunities,
    searchTerm,
    selectedExchanges,
    visibleCount,
    normalizeSymbol,
  ]);

  const getFuturesSymbol = (exchange, item) => {
    if (exchange === "gateio") return item.contract;
    if (exchange === "kucoin") return item.symbol;
    return item.symbol;
  };

  const getFuturesPrice = (exchange, item) => {
    if (exchange === "gateio") return item.last;
    if (exchange === "kucoin") return item.price;
    return item.last ?? item.lastPrice; // <- aqui!! se não for gateio nem kucoin, usa a lógica que você falou
  };

  // Função para buscar dados iniciais de forma otimizada
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const allData = {};

      // Busca dados apenas das exchanges selecionadas
      const fetchPromises = selectedExchanges.map(async (exchange) => {
        try {
          const [spotResponse, futuresResponse] = await Promise.all([
            axios.get(`http://${SERVER_URL}:5000/api/${exchange}/spot/prices`),
            axios.get(
              `http://${SERVER_URL}:5000/api/${exchange}/futures/prices`
            ),
          ]);

          return {
            exchange,
            spot: spotResponse.data,
            futures: futuresResponse.data,
          };
        } catch (error) {
          console.error(`Erro ao buscar dados de ${exchange}:`, error);
          return { exchange, spot: [], futures: [] };
        }
      });

      const results = await Promise.all(fetchPromises);
      results.forEach(({ exchange, spot, futures }) => {
        allData[exchange] = { spot, futures };
      });

      // Processa oportunidades em lotes
      const opportunities = [];
      const processedPairs = new Set();

      // Compara cada exchange com todas as outras selecionadas
      selectedExchanges.forEach((exchange1) => {
        const data1 = allData[exchange1];
        if (!data1) return;

        selectedExchanges.forEach((exchange2) => {
          const data2 = allData[exchange2];
          if (!data2) return;

          // Processa spot vs futures na mesma exchange
          if (exchange1 === exchange2) {
            data1.spot?.forEach((spotItem1) => {
              const normalizedSymbolSpot = normalizeSymbol(spotItem1.symbol);

              data1.futures?.forEach((futuresItem1) => {
                const normalizedFuturesSymbol = normalizeSymbol(
                  cleanFuturesSymbol(
                    exchange1,
                    getFuturesSymbol(exchange1, futuresItem1)
                  )
                );
                if (normalizedFuturesSymbol === normalizedSymbolSpot) {
                  console.log("MATCH encontrado!", {
                    corretora: exchange1,
                    symbolSpot: spotItem1.symbol,
                    priceSpot: spotItem1.price,
                    symbolFutures: futuresItem1.symbol,
                    priceFutures: futuresItem1.lastPrice,
                  });
                  const spotPrice = parseFloat(spotItem1.price);
                  const futuresPrice = parseFloat(
                    getFuturesPrice(exchange1, futuresItem1)
                  );

                  if (isNaN(spotPrice) || isNaN(futuresPrice)) {
                    return; // Não cria se não tiver preço válido
                  }

                  const profit = calculateProfit(spotPrice, futuresPrice);

                  if (profit >= MIN_PROFIT) {
                    const id = `${exchange1}-${normalizedSymbolSpot}-sf`;
                    if (!processedPairs.has(id)) {
                      opportunities.push({
                        id,
                        symbol: normalizedSymbolSpot,
                        exchange1,
                        exchange2: exchange1,
                        type: "spot-futures",
                        price1: spotPrice,
                        price2: futuresPrice,
                        profit,
                        timestamp: Date.now(),
                        liquidity1: getLiquidityValue(exchange1, spotItem1),
                        liquidity2: getLiquidityValue(exchange2, futuresItem1),
                      });
                      processedPairs.add(id);
                    }
                  }
                }
              });
            });
          }
          // Compara entre diferentes exchanges
          else {
            // Spot vs Spot entre exchanges
            data1.spot?.forEach((spotItem1) => {
              const normalizedSymbolSpot = normalizeSymbol(spotItem1.symbol);

              data2.spot?.forEach((spotItem2) => {
                if (
                  normalizeSymbol(spotItem2.symbol) === normalizedSymbolSpot
                ) {
                  const profit = calculateProfit(
                    parseFloat(spotItem1.price),
                    parseFloat(spotItem2.price)
                  );

                  if (profit >= MIN_PROFIT) {
                    const id = `${exchange1}-${exchange2}-${normalizedSymbolSpot}-ss`;
                    if (!processedPairs.has(id)) {
                      opportunities.push({
                        id,
                        symbol: normalizedSymbolSpot,
                        exchange1,
                        exchange2,
                        type: "spot-spot",
                        price1: parseFloat(spotItem1.price),
                        price2: parseFloat(spotItem2.price),
                        profit,
                        timestamp: Date.now(),
                        liquidity1: getLiquidityValue(exchange1, spotItem1),
                        liquidity2: getLiquidityValue(exchange2, spotItem2),
                      });
                      processedPairs.add(id);
                    }
                  }
                }
              });

              // Spot vs Futures entre exchanges
              data2.futures?.forEach((futuresItem2) => {
                const normalizedFuturesSymbol2 = normalizeSymbol(
                  cleanFuturesSymbol(
                    exchange2,
                    getFuturesSymbol(exchange2, futuresItem2)
                  )
                );
                if (normalizedFuturesSymbol2 === normalizedSymbolSpot) {
                  const spotPrice = parseFloat(spotItem1.price);
                  const futuresPrice = parseFloat(
                    getFuturesPrice(exchange2, futuresItem2)
                  );

                  if (isNaN(spotPrice) || isNaN(futuresPrice)) {
                    return; // pula se algum preço estiver inválido
                  }

                  const profit = calculateProfit(spotPrice, futuresPrice);

                  if (profit >= MIN_PROFIT) {
                    const id = `${exchange1}-${exchange2}-${normalizedSymbolSpot}-sf`;
                    if (!processedPairs.has(id)) {
                      opportunities.push({
                        id,
                        symbol: normalizedSymbolSpot,
                        exchange1,
                        exchange2,
                        type: "spot-futures",
                        price1: spotPrice,
                        price2: futuresPrice,
                        profit,
                        timestamp: Date.now(),
                        liquidity1: getLiquidityValue(exchange1, spotItem1),
                        liquidity2: getLiquidityValue(exchange2, futuresItem2),
                      });
                      processedPairs.add(id);
                    }
                  }
                }
              });
            });
          }
        });
      });

      setOpportunities(opportunities.sort((a, b) => b.profit - a.profit));
    } catch (error) {
      console.error("Erro ao buscar dados iniciais:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedExchanges, normalizeSymbol, calculateProfit]);

  // Configuração do Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + BATCH_SIZE);
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Efeito para buscar dados iniciais quando as exchanges selecionadas mudam
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]); // fetchInitialData já é um useCallback com selectedExchanges como dep.

  // Conexão WebSocket otimizada
  useEffect(() => {
    // selectedExchangesRef.current é atualizado em outro useEffect se necessário,
    // mas aqui vamos focar na conexão e no processamento geral.
    console.log(
      `[Market WebSocket Setup useEffect] Configurando WebSocket. Servidor: ${SERVER_URL}`
    );

    const wsUrl = `ws://${SERVER_URL}:5000/ws`;
    let currentWs = null; // Variável local para o socket da instância atual do useEffect

    const connect = () => {
      // Fecha conexão anterior se existir e pertencer a esta instância do useEffect
      if (currentWs && currentWs.readyState !== WebSocket.CLOSED) {
        console.log(
          "[Market WebSocket Cleanup] Tentando fechar conexão WebSocket existente antes de reconectar."
        );
        currentWs.onclose = null; // Evitar trigger de reconexão da instância antiga
        currentWs.onerror = null;
        currentWs.onmessage = null;
        currentWs.onopen = null;
        currentWs.close();
      }

      console.log(
        `[Market WebSocket Setup] Criando nova instância WebSocket para ${wsUrl}...`
      );
      currentWs = new WebSocket(wsUrl);
      ws.current = currentWs; // Atualiza a ref global

      const socketInstance = currentWs; // Captura a instância atual para os callbacks

      socketInstance.onopen = () => {
        if (ws.current !== socketInstance) {
          console.log(
            "[Market WebSocket onopen] Evento de socket obsoleto ignorado."
          );
          return;
        }
        console.log(`[Market WebSocket onopen] Conectado a ${wsUrl}`);
        setWsConnected(true);
      };

      socketInstance.onmessage = (event) => {
        // Removido debounce temporariamente para log imediato
        console.log(
          "[Market WebSocket onmessage - RAW] Mensagem bruta recebida:",
          event.data ? event.data.substring(0, 100) + "..." : "sem dados"
        );
        if (ws.current !== socketInstance) {
          console.log(
            "[Market WebSocket onmessage] Evento de socket obsoleto ignorado."
          );
          return;
        }
        try {
          const parsedData = JSON.parse(event.data);
          console.log(
            "[Market WebSocket onmessage - Parsed] Dados parseados:",
            parsedData && parsedData.length > 0
              ? parsedData.slice(0, 2)
              : parsedData
          );
          if (processWebSocketUpdateRef.current) {
            processWebSocketUpdateRef.current(parsedData);
          }
        } catch (error) {
          console.error(
            "[Market WebSocket onmessage] Erro ao processar mensagem:",
            error
          );
        }
      };

      socketInstance.onclose = () => {
        if (ws.current !== socketInstance) {
          console.log(
            "[Market WebSocket onclose] Evento de socket obsoleto ignorado."
          );
          return;
        }
        console.log(`[Market WebSocket onclose] Desconectado de ${wsUrl}`);
        setWsConnected(false);
        // Tenta reconectar após 5 segundos apenas se este socket ainda for o ws.current
        // E se não estivermos no processo de desmontagem (ver limpeza do useEffect)
        if (ws.current === socketInstance) {
          console.log(
            "[Market WebSocket onclose] Tentando reconectar em 5 segundos..."
          );
          setTimeout(connect, 5000);
        }
      };

      socketInstance.onerror = (error) => {
        if (ws.current !== socketInstance) {
          console.log(
            "[Market WebSocket onerror] Evento de socket obsoleto ignorado."
          );
          return;
        }
        console.error("[Market WebSocket onerror] Erro:", error);
        setWsConnected(false);
        // O onclose será chamado, então a lógica de reconexão está lá.
      };
    };

    // connect(); // Chamada original comentada para teste

    // Atrasar a conexão inicial para diagnóstico
    console.log(
      "[Market WebSocket Setup useEffect] Agendando conexão inicial com atraso de 100ms."
    );
    const initialConnectTimeout = setTimeout(() => {
      console.log(
        "[Market WebSocket Setup useEffect] Timeout disparado. Tentando conectar..."
      );
      connect();
    }, 100);

    return () => {
      clearTimeout(initialConnectTimeout); // Limpar o timeout se o componente desmontar antes
      console.log("[Market WebSocket Cleanup useEffect] Limpando WebSocket.");
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        // Define ws.current como null ANTES de fechar para que o onclose não tente reconectar
        const socketToClose = ws.current;
        ws.current = null;
        socketToClose.onclose = null;
        socketToClose.onerror = null;
        socketToClose.onmessage = null;
        socketToClose.onopen = null;
        socketToClose.close();
        console.log(
          "[Market WebSocket Cleanup useEffect] Conexão WebSocket fechada."
        );
      } else if (ws.current) {
        console.log(
          `[Market WebSocket Cleanup useEffect] WebSocket não estava OPEN (estado: ${ws.current.readyState}). Apenas definindo ws.current como null.`
        );
        ws.current = null;
      } else {
        console.log(
          "[Market WebSocket Cleanup useEffect] Nenhuma conexão WebSocket para limpar (ws.current já é null)."
        );
      }
    };
  }, [SERVER_URL]); // Depende apenas de SERVER_URL e da ref de processWebSocketUpdate (que é estável)

  // Handler para pesquisa otimizado
  const handleSearch = debounce((value) => {
    setSearchTerm(value);
  }, 300);

  // Handler para seleção de exchanges otimizado
  const handleExchangeToggle = useCallback((exchange) => {
    setSelectedExchanges((prev) => {
      const newSelection = prev.includes(exchange)
        ? prev.filter((e) => e !== exchange)
        : [...prev, exchange];

      // Se não houver exchanges selecionadas, mantém pelo menos uma
      return newSelection.length === 0 ? [exchange] : newSelection;
    });
  }, []);

  return (
    <Layout>
      <CryptoBackground />
      <div className="market-analysis-container">
        <div className="market-analysis-header">
          <h2>Análise de Mercado</h2>
          <div className="connection-status">
            <span
              className={`status-dot ${
                wsConnected ? "connected" : "disconnected"
              }`}
            />
            <span>{wsConnected ? "Conectado" : "Reconectando..."}</span>
          </div>
        </div>

        <div className="filters-container">
          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar por símbolo..."
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="exchange-filters">
            {EXCHANGES.map((exchange) => (
              <button
                key={exchange}
                className={`exchange-filter-btn ${
                  selectedExchanges.includes(exchange) ? "active" : ""
                }`}
                onClick={() => handleExchangeToggle(exchange)}
              >
                {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="opportunities-container">
          {loading ? (
            <div className="loading">Carregando oportunidades...</div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="no-data">Nenhuma oportunidade encontrada</div>
          ) : (
            <AnimatePresence>
              <div className="opportunities-grid">
                {filteredOpportunities
                  .filter((opp) => {
                    const onlyOneExchangeSelected =
                      selectedExchanges.length === 1;
                    const sameExchange = opp.exchange1 === opp.exchange2;
                    const isSpotFutures = opp.type === "spot-futures";

                    if (onlyOneExchangeSelected) {
                      return sameExchange; // mostra tudo da mesma corretora
                    } else {
                      return true; // mostra todas oportunidades (spot-spot e spot-futures)
                    }
                  })
                  .map((opp) => (
                    <motion.div
                      key={opp.id}
                      className={`opportunity-card ${
                        false ? "highlight-update" : ""
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <div className="card-header">
                        <h3>{opp.symbol}</h3>
                        <span className="profit">{opp.profit.toFixed(2)}%</span>
                      </div>
                      <div className="card-body">
                        <div className="exchange-info">
                          <div className="exchange">
                            <span className="label">{opp.exchange1}</span>
                            <span className="price">
                              ${opp.price1.toFixed(4)}
                            </span>
                            {opp.liquidity1 > 0 && (
                              <span className="liquidity">
                                💧{" "}
                                {opp.liquidity1.toLocaleString("en-US", {
                                  style: "currency",
                                  currency: "USD",
                                  maximumFractionDigits: 0,
                                })}
                              </span>
                            )}
                          </div>
                          <div className="exchange">
                            <span className="label">{opp.exchange2}</span>
                            <span className="price">
                              ${opp.price2.toFixed(4)}
                            </span>
                            {opp.liquidity2 > 0 && (
                              <span className="liquidity">
                                💧{" "}
                                {opp.liquidity2.toLocaleString("en-US", {
                                  style: "currency",
                                  currency: "USD",
                                  maximumFractionDigits: 0,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="type-badge">{opp.type}</div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </AnimatePresence>
          )}
          <div ref={loadingRef} className="load-more">
            {opportunities.length > visibleCount && (
              <div className="loading">Carregando mais...</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MarketAnalysis;
