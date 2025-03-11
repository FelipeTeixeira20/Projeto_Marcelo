import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import axios from "axios";
import "./MarketAnalysis.css";

const exchanges = [
    { name: "Binance", color: "#F3BA2F" },
    { name: "Bitget", color: "#00FF7F" },
    { name: "Gate.io", color: "#00AA00" },
    { name: "KuCoin", color: "#0052FF" },
    { name: "MEXC", color: "#FF0000" },
];

const MarketAnalysis = () => {
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedExchanges, setSelectedExchanges] = useState(exchanges.map(e => e.name));
    const [comparisonData, setComparisonData] = useState([]);
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("");

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                if (!token) {
                    console.error("Erro: Token não encontrado.");
                    return;
                }

                const responses = await Promise.all([
                    axios.get("http://localhost:5000/api/binance/prices", {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get("http://localhost:5000/api/bitget/prices", {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get("http://localhost:5000/api/gateio/prices", {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get("http://localhost:5000/api/kucoin/prices", {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get("http://localhost:5000/api/mexc/prices", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                const formattedPrices = {
                    Binance: responses[0].data,
                    Bitget: responses[1].data,
                    "Gate.io": responses[2].data,
                    KuCoin: responses[3].data,
                    MEXC: responses[4].data
                };

                console.log("✅ Dados carregados com sucesso:", formattedPrices);

                setPrices(formattedPrices);
                setLoading(false);
            } catch (error) {
                console.error("❌ Erro ao buscar preços:", error);
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 5000);

        return () => clearInterval(interval);
    }, []);

    const toggleExchange = (exchange) => {
        setSelectedExchanges(prev =>
            prev.includes(exchange) ? prev.filter(e => e !== exchange) : [...prev, exchange]
        );
    };

    useEffect(() => {
        if (selectedExchanges.length < 2 || Object.keys(prices).length === 0) return;

        const generateComparisons = () => {
            const newComparisons = [];
            const symbols = new Set();

            Object.values(prices).forEach(exchangePrices => {
                exchangePrices.forEach(crypto => {
                    symbols.add(crypto.symbol);
                });
            });

            symbols.forEach(symbol => {
                selectedExchanges.forEach((exchange1, i) => {
                    selectedExchanges.slice(i + 1).forEach(exchange2 => {
                        let price1 = prices[exchange1]?.find(c => c.symbol === symbol)?.price;
                        let price2 = prices[exchange2]?.find(c => c.symbol === symbol)?.price;

                        price1 = parseFloat(price1);
                        price2 = parseFloat(price2);

                        if (!isNaN(price1) && !isNaN(price2)) {
                            const spread = Math.abs(price1 - price2);
                            const profitPercent = ((price2 - price1) / price1) * 100;
                            const fundingRate = (Math.random() * 0.05).toFixed(4);

                            newComparisons.push({
                                symbol,
                                exchange1,
                                exchange2,
                                price1: price1.toFixed(4),
                                price2: price2.toFixed(4),
                                profitPercent: profitPercent.toFixed(2),
                                spread: spread.toFixed(4),
                                fundingRate
                            });
                        }
                    });
                });
            });

            setComparisonData(newComparisons);
        };

        generateComparisons();
    }, [selectedExchanges, prices]);

    // 🔄 Filtrando os resultados com a barra de busca
    const filteredComparisons = comparisonData.filter(comp => {
        if (filter === "positive") return comp.fundingRate > 0;
        if (filter === "negative") return comp.fundingRate < 0;
        if (filter === "profit") return comp.profitPercent > 0;
        return comp.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // 🔄 Ordenação dos resultados
    const sortedComparisons = [...filteredComparisons].sort((a, b) => {
        if (sortOption === "profit-desc") return b.profitPercent - a.profitPercent;
        if (sortOption === "profit-asc") return a.profitPercent - b.profitPercent;
        if (sortOption === "spread-desc") return b.spread - a.spread;
        if (sortOption === "spread-asc") return a.spread - b.spread;
        return 0;
    });

    return (
        <Layout>
            <div className="market-analysis-container">
                <h2>Análise de Mercado</h2>
                <p>Compare os preços das criptomoedas entre diferentes corretoras.</p>

                {/* 🔥 Seleção de Exchanges */}
                <div className="exchange-box">
                    <h3>Selecione suas exchanges favoritas</h3>
                    <div className="exchange-filter">
                        {exchanges.map((exchange, index) => (
                            <button
                                key={index}
                                className={`exchange-button ${selectedExchanges.includes(exchange.name) ? "active" : ""}`}
                                onClick={() => toggleExchange(exchange.name)}
                                style={{
                                    borderColor: selectedExchanges.includes(exchange.name) ? exchange.color : "transparent",
                                    color: selectedExchanges.includes(exchange.name) ? "#fff" : "#aaa",
                                }}
                            >
                                {exchange.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 🔥 Barra de Busca e Filtros */}
                <div className="search-filter-container">
                    <input
                        type="text"
                        placeholder="🔍 Buscar moeda..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="search-input"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">Todas</option>
                        <option value="profit">Maior Lucro</option>
                        <option value="positive">Taxa +</option>
                        <option value="negative">Taxa -</option>
                    </select>
                    <select
                        className="search-input"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                    >
                        <option value="">Ordenar por...</option>
                        <option value="profit-desc">Lucro: Maior → Menor</option>
                        <option value="profit-asc">Lucro: Menor → Maior</option>
                        <option value="spread-desc">Spread: Maior → Menor</option>
                        <option value="spread-asc">Spread: Menor → Maior</option>
                    </select>
                </div>

                {/* 🔄 Exibição dos resultados */}
                {loading ? (
                    <p>Carregando dados...</p>
                ) : (
                    <div className="comparisons-container">
                        {sortedComparisons.length > 0 ? (
                            sortedComparisons.map((comp, index) => (
                                <div key={index} className="comparison-card">
                                    <h3>{comp.symbol}</h3>
                                    <p><b>{comp.exchange1}</b>: ${comp.price1}</p>
                                    <p><b>{comp.exchange2}</b>: ${comp.price2}</p>
                                    <p>Lucro: {comp.profitPercent}%</p>
                                    <p>Spread: ${comp.spread}</p>
                                    <p>Taxa: {comp.fundingRate}%</p>
                                </div>
                            ))
                        ) : (
                            <p>Nenhuma comparação disponível.</p>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MarketAnalysis;
