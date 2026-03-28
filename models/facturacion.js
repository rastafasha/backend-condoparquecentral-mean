'use strict'
const { Schema, model } = require('mongoose');

const facturacionSchema = Schema({
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    nroFactura: { type: String, unique: true, required: true },
    mes: { type: Number, required: true }, 
    anio: { type: Number, required: true },
    
    detalles: [{
        origen: { 
            type: String, 
            enum: ['RESIDENCIA', 'LOCAL', 'OFICINA', 'EXTRA'], 
            required: true 
        },
        propiedadId: { type: Schema.Types.ObjectId }, 
        montoBase: { type: Number, required: true },
        descripcion: { type: String }
    }],

    // --- Campos de Impuestos ---
    porcentajeIva: { type: Number, required: true, default: 16 }, 
    aplicaRetencion: { type: Boolean, default: false, required: true }, // <--- El Booleano que faltaba
    montoRetencion: { type: Number, default: 0 }, // Solo se llena si aplicaRetencion es true
    
    otrosCargos: { type: Number, default: 0 },
    
    estado: { 
        type: String, 
        enum: ['PENDIENTE', 'PAGADO', 'ANULADO'], 
        default: 'PENDIENTE' 
    }
}, { 
    collection: 'facturaciones', 
    timestamps: true 
});

// Cálculo dinámico corregido
facturacionSchema.virtual('totalPagar').get(function() {
    const subtotal = this.detalles.reduce((acc, item) => acc + item.montoBase, 0);
    const montoIva = subtotal * (this.porcentajeIva / 100);
    
    // Si aplicaRetencion es false, ignoramos el montoRetencion aunque tenga valor
    const descuentoRetencion = this.aplicaRetencion ? this.montoRetencion : 0;
    
    return (subtotal + montoIva + this.otrosCargos) - descuentoRetencion;
});

facturacionSchema.set('toJSON', { virtuals: true });

module.exports = model('Facturacion', facturacionSchema);
