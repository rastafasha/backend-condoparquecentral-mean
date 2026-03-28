'use strict'
var mongoose = require('mongoose');
const { Schema, model } = require('mongoose');

const oficinaSchema = Schema({
    edificio: { type: String, required: true },
    letra: { type: String, required: true },
    piso: { type: String, required: true },
    montoMensual: { type: Number, required: true, default: 0 },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' },
}, { collection: 'oficinas' , timestamps: true });



module.exports = mongoose.model('Oficina', oficinaSchema);