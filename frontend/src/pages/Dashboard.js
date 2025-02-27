import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import axios from "axios";
import { FaStar } from "react-icons/fa";
import "./Dashboard.css";

const Dashboard = () => {
    const [cryptos, setCryptos] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [searchTerm, setSearchTerm] = useState(""); // 🔍 Estado para busca
    const [sortOption, setSortOption] = useState(""); // 🔽 Estado para filtro

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/mexc/prices");
                setCryptos(response.data);
            } catch (error) {
                console.error("Erro ao buscar dados da MEXC: ", error);
            }
        };
        fetchData();
    }, []);

    const toggleFavorite = (symbol) => {
        setFavorites((prev) =>
            prev.includes(symbol) ? prev.filter((fav) => fav !== symbol) : [...prev, symbol]
        );
    };

    // 🔍 Filtra as moedas conforme o usuário digita
    const filteredCryptos = cryptos.filter((crypto) =>
        crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 🔽 Ordenação das moedas conforme a opção escolhida
    const sortedCryptos = [...filteredCryptos].sort((a, b) => {
        if (sortOption === "price-asc") return parseFloat(a.price) - parseFloat(b.price);
        if (sortOption === "price-desc") return parseFloat(b.price) - parseFloat(a.price);
        if (sortOption === "alphabetical") return a.symbol.localeCompare(b.symbol);
        return 0;
    });

    return (
        <Layout>
            <div className="animated-background">
                <div className="animated-lines">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>
            <div className="dashboard-container">
                <h2 className="dashboard-title">Mercado de Criptomoedas</h2>
                <p className="dashboard-subtitle">Confira os preços atualizados das moedas na MEXC.</p>

                {/* 🔍 Campo de busca + 🔽 Filtro */}
                <div className="search-filter-container">
                    <input
                        type="text"
                        placeholder="🔍 Buscar moeda..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="filter-select"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                    >
                        <option value="">Ordenar por...</option>
                        <option value="price-asc">Preço: Menor → Maior</option>
                        <option value="price-desc">Preço: Maior → Menor</option>
                        <option value="alphabetical">Nome: A → Z</option>
                    </select>
                </div>

                {/* 🏦 Listagem das Criptomoedas */}
                <div className="crypto-container">
                    <div className="crypto-grid">
                        {sortedCryptos.length > 0 ? (
                            sortedCryptos.map((crypto, index) => (
                                <div 
                                    key={index} 
                                    className={`crypto-card ${favorites.includes(crypto.symbol) ? "favorited" : ""}`}
                                >
                                    <h3>{crypto.symbol}</h3>
                                    <p>${parseFloat(crypto.price).toFixed(4)}</p>
                                    <button
                                        className={`favorite-button ${favorites.includes(crypto.symbol) ? "favorited" : ""}`}
                                        onClick={() => toggleFavorite(crypto.symbol)}
                                    >
                                        <FaStar />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p>Nenhuma moeda encontrada...</p>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
