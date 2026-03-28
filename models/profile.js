'use strict'
var mongoose = require('mongoose');
const { Schema, model } = require('mongoose');

const profileSchema = Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    img: { type: String, required: false },
    telhome: { type: String, required: false },
    telmovil: { type: String, required: false },
    haveResidencia: { type: Boolean, required: false, default: false },
    haveOficina: { type: Boolean, required: false, default: false },
    haveLocal: { type: Boolean, required: false, default: false },
    residencia: [{ type: Schema.Types.ObjectId, ref: 'Residencia' }],
    oficina: [{ type: Schema.Types.ObjectId, ref: 'Oficina' }],
    local: [{ type: Schema.Types.ObjectId, ref: 'Local' }],
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', unique: true },
    statusFinanciero: { 
        type: String, 
        enum: ['AL_DIA', 'MOROSO', 'EN_REVISION'], 
        default: 'AL_DIA' 
    },
    deudaTotalAcumulada: { type: Number, default: 0 } 
}, { collection: 'profiles', timestamps: true });



module.exports = mongoose.model('Profile', profileSchema);