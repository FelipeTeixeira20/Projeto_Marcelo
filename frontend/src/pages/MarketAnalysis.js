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
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState(["binance"]); // Começa apenas com Binance
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);
  const opportunitiesCache = useRef(new Map());
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
  }, [opportunities, searchTerm, selectedExchanges, visibleCount, normalizeSymbol]);

  // Função para processar dados do WebSocket de forma otimizada
  const processWebSocketUpdate = useCallback(
    (data) => {
      const now = Date.now();
      const updates = new Map();

      // Agrupa atualizações por exchange e símbolo
      data.forEach((update) => {
        const key = `${update.exchangeName}-${normalizeSymbol(update.symbol)}`;
        updates.set(key, {
          price: parseFloat(update.price),
          timestamp: now,
        });
      });

      // Atualiza apenas se passou tempo suficiente desde a última atualização
      setOpportunities((prev) => {
        const updated = prev.map((opp) => {
          const key1 = `${opp.exchange1}-${opp.symbol}`;
          const key2 = `${opp.exchange2}-${opp.symbol}`;
          const update1 = updates.get(key1);
          const update2 = updates.get(key2);

          if (!update1 && !update2) return opp;

          const lastUpdate = lastUpdateTime.current.get(opp.id) || 0;
          if (now - lastUpdate < 1000) return opp; // Limita atualizações a 1 por segundo

          const newPrice1 = update1 ? update1.price : opp.price1;
          const newPrice2 = update2 ? update2.price : opp.price2;
          const profit = calculateProfit(newPrice1, newPrice2);

          if (profit < MIN_PROFIT) return opp;

          lastUpdateTime.current.set(opp.id, now);
          return {
            ...opp,
            price1: newPrice1,
            price2: newPrice2,
            profit,
            timestamp: now,
          };
        });

        return updated;
      });
    },
    [normalizeSymbol, calculateProfit]
  );
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
                const normalizedFuturesSymbol = normalizeSymbol(cleanFuturesSymbol(exchange1, getFuturesSymbol(exchange1, futuresItem1)));
                if (normalizedFuturesSymbol === normalizedSymbolSpot) {

                  console.log("MATCH encontrado!", {
                    corretora: exchange1,
                    symbolSpot: spotItem1.symbol,
                    priceSpot: spotItem1.price,
                    symbolFutures: futuresItem1.symbol,
                    priceFutures: futuresItem1.lastPrice,
                  });
                  const spotPrice = parseFloat(spotItem1.price);
                  const futuresPrice = parseFloat(getFuturesPrice(exchange1, futuresItem1));

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
                if (normalizeSymbol(spotItem2.symbol) === normalizedSymbolSpot) {
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
                      });
                      processedPairs.add(id);
                    }
                  }
                }
              });

              // Spot vs Futures entre exchanges
              data2.futures?.forEach((futuresItem2) => {
                const normalizedFuturesSymbol2 = normalizeSymbol(cleanFuturesSymbol(exchange2, getFuturesSymbol(exchange2, futuresItem2)));
                if (normalizedFuturesSymbol2 === normalizedSymbolSpot) {

                  const spotPrice = parseFloat(spotItem1.price);
                  const futuresPrice = parseFloat(getFuturesPrice(exchange2, futuresItem2));

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

  // Conexão WebSocket otimizada
  useEffect(() => {
    const connectWebSocket = () => {
      if (ws.current) {
        ws.current.close();
      }

      const wsUrl = `ws://${SERVER_URL}:5000/ws`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("WebSocket conectado");
        setWsConnected(true);
      };

      ws.current.onmessage = debounce((event) => {
        try {
          const data = JSON.parse(event.data);
          processWebSocketUpdate(data);
        } catch (error) {
          console.error("Erro ao processar mensagem do WebSocket:", error);
        }
      }, 100);

      ws.current.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWebSocket, 5000);
      };

      ws.current.onerror = (error) => {
        console.error("Erro no WebSocket:", error);
        setWsConnected(false);
      };
    };

    connectWebSocket();
    fetchInitialData();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [fetchInitialData, processWebSocketUpdate]);

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
                    const onlyOneExchangeSelected = selectedExchanges.length === 1;
                    const sameExchange = opp.exchange1 === opp.exchange2;
                    const isSpotFutures = opp.type === "spot-futures";

                    if (onlyOneExchangeSelected) {
                      return sameExchange && isSpotFutures;
                    } else {
                      return isSpotFutures;
                    }
                  })
                  .map((opp) => (
                    <motion.div
                      key={opp.id}
                      className="opportunity-card"
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
                            <span className="price">${opp.price1.toFixed(4)}</span>
                          </div>
                          <div className="exchange">
                            <span className="label">{opp.exchange2}</span>
                            <span className="price">${opp.price2.toFixed(4)}</span>
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
