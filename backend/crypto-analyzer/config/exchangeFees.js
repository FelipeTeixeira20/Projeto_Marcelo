// Taxas padrão das exchanges (em porcentagem)
const exchangeFees = {
  binance: {
    spot: {
      maker: 0.1,
      taker: 0.1,
      tradingFee: 0.1,
    },
    futures: {
      maker: 0.02,
      taker: 0.04,
      tradingFee: 0.04,
    },
  },
  mexc: {
    spot: {
      maker: 0.2,
      taker: 0.2,
      tradingFee: 0.2,
    },
    futures: {
      maker: 0.02,
      taker: 0.05,
      tradingFee: 0.05,
    },
  },
  kucoin: {
    spot: {
      maker: 0.1,
      taker: 0.1,
      tradingFee: 0.1,
    },
    futures: {
      maker: 0.02,
      taker: 0.05,
      tradingFee: 0.05,
    },
  },
  gateio: {
    spot: {
      maker: 0.2,
      taker: 0.2,
      tradingFee: 0.2,
    },
    futures: {
      maker: 0.025,
      taker: 0.055,
      tradingFee: 0.055,
    },
  },
  bitget: {
    spot: {
      maker: 0.1,
      taker: 0.1,
      tradingFee: 0.1,
    },
    futures: {
      maker: 0.02,
      taker: 0.05,
      tradingFee: 0.05,
    },
  },
};

module.exports = exchangeFees;
