const { Schema, model } = require('mongoose');

const comunicadoSchema = Schema({
    titulo: { type: String, required: true },
    mensaje: { type: String, required: true },
    
    // Categoría del aviso
    tipo: { 
        type: String, 
        enum: ['EVENTO', 'MANTENIMIENTO', 'REUNION', 'URGENTE', 'CARTELERA'], 
        default: 'CARTELERA' 
    },

    // SEGMENTACIÓN (A quién va dirigido)
    alcance_residencia: { 
        type: String, 
        enum: [
            'TODOS', 
            'CATUCHE', 'TAJAMAR', 'TACAGUA', 'SAN_MARTIN', 
            'MOHEDANO', 'CARUATA', 'EL_TEJAR', 'MEZANINA'
        ], 
        default: 'TODOS' 
    },

    alcance_torre: { 
        type: String, 
        enum: ['AMBAS', 'TORRE_ESTE', 'TORRE_OESTE'], 
        default: 'AMBAS' 
    },

    // Trazabilidad
    creado_por: { 
        type: Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true 
    },

    // Opcional: para saber si fue enviado por Push
    notificado_push: { type: Boolean, default: false }

}, { collection: 'comunicados', timestamps: true });

module.exports = model('Comunicado', comunicadoSchema);
