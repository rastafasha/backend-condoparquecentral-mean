'use strict'
var mongoose = require('mongoose');
const { Schema, model } = require('mongoose');

const paymentSchema = Schema({
    // Relación vital: ¿Qué factura se está pagando?
    factura: { 
        type: Schema.Types.ObjectId, 
        ref: 'Facturacion', 
        required: true 
    },
    // Quién paga
    cliente: { 
        type: Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true 
    },
    amount: { type: Number, required: true },
    
    // Datos de la transacción (Parque Central suele pedir esto)
    metodo_pago: { 
        type: String, 
        enum: ['TRANSFERENCIA', 'PAGO_MOVIL', 'EFECTIVO', 'ZELLE'], 
        required: true 
    },
    bank_destino: { type: String }, // Ej: Banesco, Mercantil
    referencia: { type: String, required: true }, 
    
    // Soporte visual (Capture)
    img: { type: String, required: false },

    // Control administrativo
    status: { 
        type: String, 
        enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'], 
        default: 'PENDIENTE' 
    },
    fecha_pago: { type: Date, default: Date.now },
    usuario_validador: { type: Schema.Types.ObjectId, ref: 'Usuario' } // Admin que aprobó
}, { 
    collection: 'payments', 
    timestamps: true 
});

module.exports = model('Payment', paymentSchema);