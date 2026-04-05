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

    // Ya no usamos un solo ivaPorcentaje global, sino la suma de los detalles
    aplicaRetencion: { type: Boolean, default: false }, 
    montoRetencion: { type: Number, default: 0 }, // Se llena cuando el usuario reporta el pago
    comprobanteRetencion: { type: String }, // URL o nombre del archivo PDF de la retención
    
    otrosCargos: { type: Number, default: 0 },
    estado: { type: String, enum: ['PENDIENTE', 'PAGADO', 'ANULADO'], default: 'PENDIENTE' }
}, { collection: 'facturaciones', timestamps: true });

// --- Cálculo Dinámico Robusto ---
facturacionSchema.virtual('totalPagar').get(function() {
    // 1. Sumamos la base imponible de todos los detalles
    const subtotal = this.detalles.reduce((acc, item) => acc + (Number(item.montoBase) || 0), 0);
    
    // 2. Sumamos el IVA de todos los detalles (ya que lo guardas por línea)
    const montoIvaTotal = this.detalles.reduce((acc, item) => acc + (Number(item.montoIva) || 0), 0);
    
    const otros = Number(this.otrosCargos) || 0;
    const retencion = this.aplicaRetencion ? (Number(this.montoRetencion) || 0) : 0;

    // 3. Resultado final con redondeo
    return Math.round((subtotal + montoIvaTotal + otros - retencion) * 100) / 100;
});

facturacionSchema.set('toJSON', { virtuals: true });

module.exports = model('Facturacion', facturacionSchema);
