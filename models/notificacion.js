'use strict'
const { Schema, model } = require('mongoose');

const notificacionSchema = Schema({
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    titulo: { type: String, required: true }, // Ej: "Pago Aprobado"
    mensaje: { type: String, required: true }, // Ej: "Tu pago de la factura FAC-123 ha sido validado."
    tipo: { 
        type: String, 
        enum: ['PAGO_APROBADO', 'PAGO_RECHAZADO', 'NUEVA_FACTURA', 'AVISO_MOROSIDAD'],
        required: true 
    },
    leido: { type: Boolean, default: false },
    referenciaId: { type: Schema.Types.ObjectId }, // ID del Pago o Factura relacionado
}, { timestamps: true });

module.exports = model('Notificacion', notificacionSchema);
