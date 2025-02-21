const mongoose = require('mongoose');

const CryptoSchema = new mongoose.Schema({
    name: String,
    exchange: String,
    price: Number,
    volume: Number,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Crypto', CryptoSchema);
