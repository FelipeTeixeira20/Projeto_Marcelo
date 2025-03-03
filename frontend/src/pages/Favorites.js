import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import { FaStar } from "react-icons/fa";
import CryptoModal from '../components/CryptoModal';
import CryptoBackground from "../components/CryptoBackground";
import axios from "axios";
import "./Favorites.css";

const SERVER_URL = window.location.hostname === "192.168.100.26" ? "192.168.100.26" : window.location.hostname;

const Favorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [selectedCrypto, setSelectedCrypto] = useState(null);
    const [priceUpdates, setPriceUpdates] = useState({});
    const [priceChanges, setPriceChanges] = useState({});
    const ws = useRef(null);
    const reconnectTimeout = useRef(null);

    useEffect(() => {
        const loadFavorites = () => {
            try {
                const storedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
                const uniqueFavorites = Array.from(new Map(storedFavorites.map(item => [item.symbol, item])).values());
                setFavorites(uniqueFavorites);
            } catch (error) {
                console.error('Erro ao carregar favoritos:', error);
                setFavorites([]);
            }
        };

        loadFavorites();
    }, []);

    // 🔥 WebSocket para atualizar os preços em tempo real
    useEffect(() => {
        const connectWebSocket = () => {
            if (ws.current) {
                ws.current.close();
            }

            ws.current = new WebSocket(`ws://${SERVER_URL}:5000/ws`);

            ws.current.onopen = () => {
                console.log("🔗 WebSocket conectado.");
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (Array.isArray(data)) {
                        const updates = {};
                        const changes = {}; 

                        data.forEach(item => {
                            updates[item.symbol] = parseFloat(item.price);

                            // 🔥 Verifica se o preço mudou para definir a classe `up` ou `down`
                            if (priceUpdates[item.symbol] !== undefined) {
                                changes[item.symbol] = updates[item.symbol] > priceUpdates[item.symbol] ? "up" : "down";
                            }
                        });

                        setPriceUpdates(updates);
                        setPriceChanges(changes);

                        setFavorites(prevFavorites => 
                            prevFavorites.map(fav => ({
                                ...fav,
                                current_price: updates[fav.symbol] || fav.current_price
                            }))
                        );

                        setTimeout(() => {
                            setPriceChanges(prevChanges => {
                                const resetChanges = { ...prevChanges };
                                Object.keys(resetChanges).forEach(symbol => {
                                    resetChanges[symbol] = "";
                                });
                                return resetChanges;
                            });
                        }, 2000);
                        
                    }
                } catch (error) {
                    console.error("Erro ao processar dados do WebSocket:", error);
                }
            };

            ws.current.onclose = () => {
                console.log("⚠️ WebSocket desconectado. Tentando reconectar...");
                if (!reconnectTimeout.current) {
                    reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
                }
            };
        };

        connectWebSocket();

        return () => {
            if (ws.current) {
                ws.current.close();
                console.log("🔌 WebSocket fechado ao sair da tela.");
            }
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }
        };
    }, []);

    const handleUnfavorite = (symbol) => {
        const updatedFavorites = favorites.filter(fav => fav.symbol !== symbol);
        setFavorites(updatedFavorites);
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    };

    const handleCardClick = async (symbol) => {
        try {
            setSelectedCrypto({ symbol });
            
            const response = await axios.get(`http://localhost:5000/api/mexc/ticker/${encodeURIComponent(symbol)}`);
            const tickerData = response.data;
            
            setSelectedCrypto({
                symbol,
                price: tickerData.lastPrice,
                lastPrice: tickerData.lastPrice,
                highPrice: tickerData.highPrice,
                lowPrice: tickerData.lowPrice,
                volume: tickerData.volume,
                amount: tickerData.quoteVolume
            });
        } catch (error) {
            console.error('Error fetching ticker data:', error);
        }
    };

    return (
        <Layout>
            <CryptoBackground />

            <div className="favorites-container">
                <div className="favorites-header">
                    <h2 className="favorites-title">Minhas Criptomoedas Favoritas</h2>
                    <p className="favorites-count">
                        Total de moedas favoritas: <span>{favorites.length}</span>
                    </p>
                </div>
                
                {favorites.length === 0 ? (
                    <p className="empty-message">
                        Você ainda não adicionou nenhuma criptomoeda aos favoritos.
                    </p>
                ) : (
                    <div className="favorites-grid">
                        {favorites.map((coin) => (
                            <div 
                                key={coin.symbol}
                                className={`favorites-card ${priceChanges[coin.symbol] ? `favorite-${priceChanges[coin.symbol]}` : ""}`}
                                onClick={() => handleCardClick(coin.symbol)}
                            >
                        
                                <button
                                    className="favorite-button favorited"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnfavorite(coin.symbol);
                                    }}
                                >
                                    <FaStar color="gold" />
                                </button>
                                <h3>{coin.symbol}</h3>
                                <p className="favorites-price">
                                    ${parseFloat(coin.current_price).toFixed(4)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {selectedCrypto && (
                    <CryptoModal
                        crypto={selectedCrypto}
                        onClose={() => setSelectedCrypto(null)}
                    />
                )}
            </div>
        </Layout>
    );
};

export default Favorites;
