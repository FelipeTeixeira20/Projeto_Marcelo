import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import CryptoBackground from "../components/CryptoBackground";
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

                const responses = await Promise.all(
                    exchanges.map(exchange =>
                        axios.get(`http://localhost:5000/api/${exchange.name.toLowerCase()}/prices`, {
                            headers: { Authorization: `Bearer ${token}` }
                        }).catch(() => ({ data: [] }))
                    )
                );

                const formattedPrices = exchanges.reduce((acc, exchange, index) => {
                    acc[exchange.name] = responses[index].data;
                    return acc;
                }, {});

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

        const newComparisons = [];
        const symbols = new Set();

        Object.values(prices).forEach(exchangePrices => {
            exchangePrices.forEach(crypto => symbols.add(crypto.symbol));
        });

        symbols.forEach(symbol => {
            selectedExchanges.forEach((exchange1, i) => {
                selectedExchanges.slice(i + 1).forEach(exchange2 => {
                    let price1 = parseFloat(prices[exchange1]?.find(c => c.symbol === symbol)?.price);
                    let price2 = parseFloat(prices[exchange2]?.find(c => c.symbol === symbol)?.price);

                    if (!isNaN(price1) && !isNaN(price2) && price1 > 0 && price2 > 0) {
                        const maxPrice = Math.max(price1, price2);
                        const minPrice = Math.min(price1, price2);
                        const spread = Math.abs(price1 - price2);
                        const profitPercent = ((maxPrice / minPrice) - 1) * 100;
                        const fundingRate = (Math.random() * 0.05).toFixed(4);

                        if (profitPercent > 0) {
                            newComparisons.push({
                                symbol,
                                exchange1,
                                exchange2,
                                price1,
                                price2,
                                profitPercent: profitPercent.toFixed(2),
                                spread: spread.toFixed(8),
                                fundingRate
                            });
                        }
                    }
                });
            });
        });

        setComparisonData(newComparisons);
    }, [selectedExchanges, prices]);

    const filteredComparisons = comparisonData.filter(comp =>
        comp.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedComparisons = [...filteredComparisons].sort((a, b) => {
        if (sortOption === "profit-desc") return b.profitPercent - a.profitPercent;
        if (sortOption === "profit-asc") return a.profitPercent - b.profitPercent;
        if (sortOption === "spread-desc") return b.spread - a.spread;
        if (sortOption === "spread-asc") return a.spread - b.spread;
        return 0;
    });

    const formatPrice = (price) => {
        price = Number(price);
        if (isNaN(price) || price === 0) return "$0.00";

        if (price >= 0.01) return `$${price.toFixed(8)}`; 

        let strPrice = price.toFixed(12); 
        let match = strPrice.match(/0\.0+(?!0)/); 

        if (match) {
            let zeroCount = match[0].length - 2; 
            let significantPart = strPrice.slice(match[0].length); 

            if (zeroCount > 8) { 
                return `$0.0{${zeroCount}}${significantPart.slice(0, 2)}`;
            } else { 
                return `$${price.toFixed(8)}`; 
            }
        }

        return `$${price.toFixed(8)}`;
    };

    return (
        <Layout>
            <CryptoBackground />

            <div className="market-analysis-container">
                <h2>Análise de Mercado</h2>
                <p>Compare os preços das criptomoedas entre diferentes corretoras.</p>

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

                <div className="search-filter-container">
                    <input
                        type="text"
                        placeholder="🔍 Buscar moeda..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select className="search-input" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                        <option value="" disabled hidden>Ordenar por</option>
                        <option value="profit-desc">Lucro: Maior → Menor</option>
                        <option value="profit-asc">Lucro: Menor → Maior</option>
                        <option value="spread-desc">Spread: Maior → Menor</option>
                        <option value="spread-asc">Spread: Menor → Maior</option>
                    </select>
                </div>

                <div className="comparisons-container">
                    {sortedComparisons.map((comp, index) => (
                        <div key={index} className="comparison-card">
                            <h3>{comp.symbol}</h3>
                            <p><b>{comp.exchange1}</b>: {formatPrice(comp.price1)}</p>
                            <p><b>{comp.exchange2}</b>: {formatPrice(comp.price2)}</p>
                            <p>Lucro: {comp.profitPercent}%</p>
                            <p>Spread: {formatPrice(comp.spread)}</p>
                            <p>Taxa: {comp.fundingRate}%</p>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default MarketAnalysis;
