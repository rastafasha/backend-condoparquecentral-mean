const mongoose = require('mongoose');
require('dotenv').config();
const Facturacion = require('../models/facturacion');
const Usuario = require('../models/usuario');

const facturacionesData = [
    // Superadmin facturas
    {
        usuario: null,
        nroFactura: 'FAC-Super-202410',
        mes: 10,
        anio: 2024,
        tasaBCV: 35.2,
        detalles: [
            { origen: 'RESIDENCIA', propiedadId: null, montoBase: 500, ivaPorcentaje: 16, montoIva: 80, descripcion: 'Cuota residencia Catuche' },
            { origen: 'LOCAL', propiedadId: null, montoBase: 300, ivaPorcentaje: 16, montoIva: 48, descripcion: 'Alquiler local comercial' }
        ],
        aplicaRetencion: false,
        otrosCargos: 50,
        estado: 'PAGADO'
    },
    {
        usuario: null,
        nroFactura: 'FAC-Super-202411',
        mes: 11,
        anio: 2024,
        tasaBCV: 36.5,
        detalles: [
            { origen: 'RESIDENCIA', propiedadId: null, montoBase: 500, ivaPorcentaje: 8, montoIva: 40, descripcion: 'Cuota residencia Tajamar' },
            { origen: 'EXTRA', propiedadId: null, montoBase: 100, ivaPorcentaje: 0, montoIva: 0, descripcion: 'Multa mantenimiento' }
        ],
        aplicaRetencion: true,
        montoRetencion: 75,
        estado: 'PENDIENTE'
    },
    {
        usuario: null,
        nroFactura: 'FAC-Super-202412',
        mes: 12,
        anio: 2024,
        tasaBCV: 37.1,
        detalles: [
            { origen: 'OFICINA', propiedadId: null, montoBase: 400, ivaPorcentaje: 16, montoIva: 64, descripcion: 'Oficina ejecutiva' },
            { origen: 'LOCAL', propiedadId: null, montoBase: 300, ivaPorcentaje: 8, montoIva: 24, descripcion: 'Local parking' }
        ],
        aplicaRetencion: false,
        estado: 'PAGADO'
    },

    // Admin facturas
    {
        usuario: null,
        nroFactura: 'FAC-Admin-202410',
        mes: 10,
        anio: 2024,
        tasaBCV: 35.2,
        detalles: [
            { origen: 'RESIDENCIA', propiedadId: null, montoBase: 500, ivaPorcentaje: 16, montoIva: 80, descripcion: 'Cuota Tacagua' }
        ],
        aplicaRetencion: false,
        otrosCargos: 25,
        estado: 'PAGADO'
    },
    {
        usuario: null,
        nroFactura: 'FAC-Admin-202411',
        mes: 11,
        anio: 2024,
        tasaBCV: 36.5,
        detalles: [
            { origen: 'RESIDENCIA', propiedadId: null, montoBase: 500, ivaPorcentaje: 0, montoIva: 0, descripcion: 'Cuota San Martín' },
            { origen: 'EXTRA', propiedadId: null, montoBase: 50, ivaPorcentaje: 16, montoIva: 8, descripcion: 'Gastos administrativos' }
        ],
        aplicaRetencion: true,
        montoRetencion: 50,
        estado: 'PENDIENTE'
    },
    {
        usuario: null,
        nroFactura: 'FAC-Admin-202412',
        mes: 12,
        anio: 2024,
        tasaBCV: 37.1,
        detalles: [
            { origen: 'LOCAL', propiedadId: null, montoBase: 350, ivaPorcentaje: 8, montoIva: 28, descripcion: 'Local Mohedano' }
        ],
        aplicaRetencion: false,
        estado: 'PAGADO'
    },

    // User facturas
    {
        usuario: null,
        nroFactura: 'FAC-User-202410',
        mes: 10,
        anio: 2024,
        tasaBCV: 35.2,
        detalles: [
            { origen: 'RESIDENCIA', propiedadId: null, montoBase: 500, ivaPorcentaje: 16, montoIva: 80, descripcion: 'Cuota Caruata' },
            { origen: 'OFICINA', propiedadId: null, montoBase: 200, ivaPorcentaje: 16, montoIva: 32, descripcion: 'Oficina pequeña' }
        ],
        aplicaRetencion: false,
        estado: 'PENDIENTE'
    },
    {
        usuario: null,
        nroFactura: 'FAC-User-202411',
        mes: 11,
        anio: 2024,
        tasaBCV: 36.5,
        detalles: [
            { origen: 'RESIDENCIA', propiedadId: null, montoBase: 500, ivaPorcentaje: 16, montoIva: 80, descripcion: 'Cuota El Tejar' }
        ],
        aplicaRetencion: false,
        otrosCargos: 30,
        estado: 'PAGADO'
    },
    {
        usuario: null,
        nroFactura: 'FAC-User-202412',
        mes: 12,
        anio: 2024,
        tasaBCV: 37.1,
        detalles: [
            { origen: 'RESIDENCIA', propiedadId: null, montoBase: 500, ivaPorcentaje: 8, montoIva: 40, descripcion: 'Cuota diciembre' },
            { origen: 'EXTRA', propiedadId: null, montoBase: 75, ivaPorcentaje: 16, montoIva: 12, descripcion: 'Ajuste anual' }
        ],
        aplicaRetencion: true,
        montoRetencion: 60,
        estado: 'PENDIENTE'
    }
];

const seedFacturas = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO);
        await Facturacion.deleteMany({}); // Limpiamos facturas viejas

        // 1. Buscamos a los usuarios reales creados por tu seeder
        const juan = await Usuario.findOne({ email: 'juan@propietario.com' });
        const ana = await Usuario.findOne({ email: 'ana@propietaria.com' });
        const carlos = await Usuario.findOne({ email: 'carlos@propietario.com' });

        if (!juan || !ana || !carlos) {
            throw new Error('No se encontraron los usuarios. Corre primero el seeder de usuarios.');
        }

        const usuarios = [juan, ana, carlos];
        const facturasData = [];

        // 2. Generamos 15 facturas para cada uno (45 en total) para probar el scroll
        for (let i = 0; i < 45; i++) {
            const userIndex = Math.floor(i / 15);
            const usuarioActual = usuarios[userIndex];
            const mes = (i % 12) + 1;
            const anio = 2024;

            facturasData.push({
                usuario: usuarioActual._id, // <--- ID REAL vinculado
                nroFactura: `FAC-${usuarioActual.username.toUpperCase()}-${202400 + i}`,
                mes: mes,
                anio: anio,
                tasaBCV: 36.5,
                detalles: [
                    {
                        origen: 'RESIDENCIA',
                        montoBase: 500,
                        ivaPorcentaje: 16,
                        montoIva: 80,
                        descripcion: `Cuota de mantenimiento mes ${mes}`
                    }
                ],
                aplicaRetencion: i % 3 === 0, // Algunas con retención
                montoRetencion: i % 3 === 0 ? 50 : 0,
                otrosCargos: 0,
                estado: i % 5 === 0 ? 'PAGADO' : 'PENDIENTE' // Mayoría pendientes
            });
        }

        await Facturacion.insertMany(facturasData);
        console.log('✅ 45 Facturas vinculadas correctamente a Juan, Ana y Carlos');
        
        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        mongoose.connection.close();
    }
};

seedFacturas();

