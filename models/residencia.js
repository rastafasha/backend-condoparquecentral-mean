'use strict'
var mongoose = require('mongoose');
const { Schema, model } = require('mongoose');

const residenciaSchema = Schema({
    edificio: { type: String, required: true },
    letra: { type: String, required: true },
    piso: { type: String, required: false },
    montoMensual: { type: Number, required: true, default: 0 },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' },
}, { collection: 'residencias', timestamps: true  });



module.exports = mongoose.model('Residencia', residenciaSchema);