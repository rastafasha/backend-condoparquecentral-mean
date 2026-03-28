'use strict'
var mongoose = require('mongoose');
const { Schema, model } = require('mongoose');

const localSchema = Schema({
    edificio: { type: String, required: true },// 
    letra: { type: String, required: true },
    piso: { type: String, required: true },//nivel bolivar, lecuna, mesanina
    montoMensual: { type: Number, required: true, default: 0 },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' },
}, { collection: 'locales', timestamps: true  });



module.exports = mongoose.model('Local', localSchema);