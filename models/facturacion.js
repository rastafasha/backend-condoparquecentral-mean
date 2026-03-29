'use strict'
const { Schema, model } = require('mongoose');

const facturacionSchema = Schema({
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    nroFactura: { type: String, unique: true, required: true },
    mes: { type: Number, required: true }, 
    anio: { type: Number, required: true },
    tasaBCV: { type: Number, required: true }, // <--- VITAL guardar la tasa del día del lote

    detalles: [{
        origen: { type: String, enum: ['RESIDENCIA', 'LOCAL', 'OFICINA', 'EXTRA'], required: true },
        propiedadId: { type: Schema.Types.ObjectId }, 
        montoBase: { type: Number, required: true },
        // --- Nuevo: IVA por cada línea de detalle ---
        ivaPorcentaje: { type: Number, default: 0 }, 
        montoIva: { type: Number, default: 0 },
        descripcion: { type: String }
    }],

    // Ya no usamos un solo porcentajeIva global, sino la suma de los detalles
    aplicaRetencion: { type: Boolean, default: false }, 
    montoRetencion: { type: Number, default: 0 }, // Se llena cuando el usuario reporta el pago
    comprobanteRetencion: { type: String }, // URL o nombre del archivo PDF de la retención
    
    otrosCargos: { type: Number, default: 0 },
    estado: { type: String, enum: ['PENDIENTE', 'PAGADO', 'ANULADO'], default: 'PENDIENTE' }
}, { collection: 'facturaciones', timestamps: true });

// --- Cálculo Dinámico Robusto ---
facturacionSchema.virtual('totalPagar').get(function() {
    // Sumamos base + IVA de cada item individualmente
    const subtotal = this.detalles.reduce((acc, item) => acc + item.montoBase, 0);
    const totalIva = this.detalles.reduce((acc, item) => acc + (item.montoIva || 0), 0);
    
    const descuentoRetencion = this.aplicaRetencion ? this.montoRetencion : 0;
    
    return (subtotal + totalIva + this.otrosCargos) - descuentoRetencion;
});

facturacionSchema.set('toJSON', { virtuals: true });

module.exports = model('Facturacion', facturacionSchema);
