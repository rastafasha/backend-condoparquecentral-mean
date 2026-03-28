'use strict'
const { Schema, model } = require('mongoose');

const TransferenciaSchema = Schema({
    // ¿Quién paga?
    user: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    
    // ¿Qué factura está pagando? (VITAL para cerrar la deuda)
    factura: { type: Schema.Types.ObjectId, ref: 'Facturacion', required: true },
    
    // Datos del pago
    metodo_pago: { type: String, required: true }, // Ej: "Pago Móvil", "Zelle"
    bankName: { type: String, required: true },
    amount: { type: Number, required: true }, // Cambiado a Number para cálculos
    referencia: { type: String, required: true, unique: true },
    
    // Estado del proceso
    status: { 
        type: String, 
        enum: ['PENDING', 'APPROVED', 'REJECTED'], 
        default: 'PENDING' 
    },
    
    paymentday: { type: Date, default: Date.now },
    comprobante_img: { type: String } // Para el capture
}, { 
    timestamps: true // Esto reemplaza tu pre('save') y updatedAt manual
});

module.exports = model('Transferencia', TransferenciaSchema);
