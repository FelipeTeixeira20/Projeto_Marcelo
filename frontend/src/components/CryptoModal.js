import React from "react";
import "./CryptoModal.css";

const CryptoModal = ({ crypto, onClose }) => {
  if (!crypto) return null;

  // Função melhorada para formatar números
  const formatNumber = (value, decimals = 4) => {
    if (!value) return "0.00";
    const number = parseFloat(value);
    if (isNaN(number)) return "0.00";

    // Para valores muito grandes, usa notação K/M/B
    if (number > 1000000000) return (number / 1000000000).toFixed(2) + "B";
    if (number > 1000000) return (number / 1000000).toFixed(2) + "M";
    if (number > 1000) return (number / 1000).toFixed(2) + "K";

    return number.toFixed(decimals);
  };

  // Pega o preço mais recente disponível
  const currentPrice = crypto.lastPrice || crypto.price || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="modal-header">
          <h2>{crypto.symbol}</h2>
          <p className="current-price">${formatNumber(currentPrice, 8)}</p>
          {crypto.exchange && (
            <p className="exchange-name">
              via{" "}
              <span
                style={{
                  color:
                    crypto.exchangeColor || getExchangeColor(crypto.exchange),
                }}
              >
                {crypto.exchange}
              </span>
            </p>
          )}
        </div>

        {crypto.loading && (
          <div className="loading-message">
            <div className="spinner"></div>
            <p>Carregando dados...</p>
          </div>
        )}

        {crypto.error ? (
          <div className="error-message">
            <p>{crypto.error}</p>
          </div>
        ) : (
          !crypto.loading && (
            <div className="modal-info-grid">
              <div className="info-box">
                <label>24h High</label>
                <span>${formatNumber(crypto.highPrice)}</span>
              </div>
              <div className="info-box">
                <label>24h Low</label>
                <span>${formatNumber(crypto.lowPrice)}</span>
              </div>
              <div className="info-box">
                <label>24h Volume</label>
                <span>{formatNumber(crypto.volume)}</span>
              </div>
              <div className="info-box">
                <label>24h Amount</label>
                <span>${formatNumber(crypto.amount)}</span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

// Função para obter a cor da exchange
function getExchangeColor(exchangeName) {
  const exchangeColors = {
    MEXC: "#FF0000",
    Binance: "#F3BA2F",
    Bitget: "#00FF7F",
    "Gate.io": "#00AA00",
    KuCoin: "#0052FF",
  };

  return exchangeColors[exchangeName] || "#FFFFFF";
}

export default CryptoModal;
