'use strict'
const { Schema, model } = require('mongoose');

const TransferenciaSchema = Schema({
    // ¿Quién paga?
    user: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    
    // ¿Qué factura está pagando? (VITAL para cerrar la deuda)
    factura: { type: Schema.Types.ObjectId, ref: 'Facturacion', required: true },
    
    // Datos del pago
    metodo_pago: { 
        type: String, 
        enum: ['TRANSFERENCIA', 'PAGO_MOVIL', 'EFECTIVO', 'ZELLE'], 
        required: false 
    },
    bankName: { type: String, required: true },
    amount: { type: Number, required: true }, // Cambiado a Number para cálculos
    referencia: { type: String, required: true, unique: true },
    tasaBCV: { type: Number, required: true },
    // Estado del proceso
    status: { 
        type: String, 
        enum: ['PENDING', 'APPROVED', 'REJECTED'], 
        default: 'PENDING' 
    },
    
    paymentday: { type: Date, default: Date.now },
    img: { type: String } // Para el capture
}, { 
    timestamps: true 
});

module.exports = model('Transferencia', TransferenciaSchema);
