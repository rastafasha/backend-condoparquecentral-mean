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

const seedFacturaciones = async () => {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.DB_MONGO);
        console.log('✅ Conectado a la base de datos');

        // Eliminar facturaciones existentes
        await Facturacion.deleteMany({});
        console.log('✅ Facturaciones existentes eliminadas');

        // Obtener usuarios existentes y asignar ObjectIds
        const usuarios = await Usuario.find({});
        if (usuarios.length < 3) {
            throw new Error('Ejecuta primero el usuarioSeeder.js para tener usuarios de prueba');
        }

        const [superadmin, admin, user] = usuarios;
        facturacionesData[0].usuario = superadmin._id;
        facturacionesData[1].usuario = superadmin._id;
        facturacionesData[2].usuario = superadmin._id;
        facturacionesData[3].usuario = admin._id;
        facturacionesData[4].usuario = admin._id;
        facturacionesData[5].usuario = admin._id;
        facturacionesData[6].usuario = user._id;
        facturacionesData[7].usuario = user._id;
        facturacionesData[8].usuario = user._id;

        // Insertar facturaciones
        const facturacionesGuardadas = await Facturacion.insertMany(facturacionesData);
        console.log('✅ 9 Facturaciones insertadas correctamente');

        // Log detallado con populate y virtuals
        const facturasConDetalle = await Facturacion.find().populate('usuario', 'username email');
        facturasConDetalle.forEach((factura, index) => {
            console.log(`   ${index + 1}. ${factura.nroFactura}`);
            console.log(`      Usuario: ${factura.usuario?.username || 'N/A'} (${factura.usuario?.email || 'N/A'})`);
            console.log(`      Total a pagar: $${factura.totalPagar?.toFixed(2) || 'N/A'}`);
            console.log(`      Estado: ${factura.estado}`);
            console.log(`      Mes: ${factura.mes}/${factura.anio}`);
            console.log('');
        });

        mongoose.connection.close();
        console.log('✅ Conexión cerrada');
    } catch (error) {
        console.error('❌ Error al ejecutar el seeder:', error.message);
        mongoose.connection.close();
        process.exit(1);
    }
};

seedFacturaciones();
