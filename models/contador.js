const mongoose = require('mongoose');

const contadorSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Ej: "nroFactura"
    secuencia: { type: Number, default: 0 }
});

module.exports = mongoose.model('Contador', contadorSchema);