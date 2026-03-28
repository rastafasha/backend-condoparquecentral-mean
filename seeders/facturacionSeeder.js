const mongoose = require('mongoose');
require('dotenv').config();
const Facturacion = require('../models/facturacion');
const Usuario = require('../models/usuario');

const facturacionesData = [
    // Superadmin facturas
    {
        usuario: null, // Se llenará con ObjectId después
        nroFactura: 'FAC-Super-202410',
        mes: 10,
        anio: 2024,
        detalles: [
            { origen: 'RESIDENCIA', propiedadId: null, montoBase: 500, descripcion: 'Cuota residencia Catuche' },
            { origen: 'LOCAL', propiedadId: null, montoBase: 300, descripcion: 'Alquiler local comercial' }
        ],
        porcentajeIva: 16,
        aplicaRetencion: false,
        otrosCargos: 50,
        estado: 'PAGADO'
    },
    {
        usuario: null,
        nroFactura: 'FAC-Super-202411',
        mes: 11,
        anio: 2024,
        detalles: [
            { origen: 'RESIDENCIA', montoBase: 500, descripcion: 'Cuota residencia Tajamar' },
            { origen: 'EXTRA', montoBase: 100, descripcion: 'Multa mantenimiento' }
        ],
        porcentajeIva: 16,
        aplicaRetencion: true,
        montoRetencion: 75,
        estado: 'PENDIENTE'
    },
    {
        usuario: null,
        nroFactura: 'FAC-Super-202412',
        mes: 12,
        anio: 2024,
        detalles: [
            { origen: 'OFICINA', montoBase: 400, descripcion: 'Oficina ejecutiva' },
            { origen: 'LOCAL', montoBase: 300, descripcion: 'Local parking' }
        ],
        porcentajeIva: 16,
        aplicaRetencion: false,
        estado: 'PAGADO'
    },

    // Admin facturas
    {
        usuario: null,
        nroFactura: 'FAC-Admin-202410',
        mes: 10,
        anio: 2024,
        detalles: [
            { origen: 'RESIDENCIA', montoBase: 500, descripcion: 'Cuota Tacagua' }
        ],
        porcentajeIva: 16,
        aplicaRetencion: false,
        otrosCargos: 25,
        estado: 'PAGADO'
    },
    {
        usuario: null,
        nroFactura: 'FAC-Admin-202411',
        mes: 11,
        anio: 2024,
        detalles: [
            { origen: 'RESIDENCIA', montoBase: 500, descripcion: 'Cuota San Martín' },
            { origen: 'EXTRA', montoBase: 50, descripcion: 'Gastos administrativos' }
        ],
        porcentajeIva: 16,
        aplicaRetencion: true,
        montoRetencion: 50,
        estado: 'PENDIENTE'
    },
    {
        usuario: null,
        nroFactura: 'FAC-Admin-202412',
        mes: 12,
        anio: 2024,
        detalles: [
            { origen: 'LOCAL', montoBase: 350, descripcion: 'Local Mohedano' }
        ],
        porcentajeIva: 16,
        aplicaRetencion: false,
        estado: 'PAGADO'
    },

    // User facturas
    {
        usuario: null,
        nroFactura: 'FAC-User-202410',
        mes: 10,
        anio: 2024,
        detalles: [
            { origen: 'RESIDENCIA', montoBase: 500, descripcion: 'Cuota Caruata' },
            { origen: 'OFICINA', montoBase: 200, descripcion: 'Oficina pequeña' }
        ],
        porcentajeIva: 16,
        aplicaRetencion: false,
        estado: 'PENDIENTE'
    },
    {
        usuario: null,
        nroFactura: 'FAC-User-202411',
        mes: 11,
        anio: 2024,
        detalles: [
            { origen: 'RESIDENCIA', montoBase: 500, descripcion: 'Cuota El Tejar' }
        ],
        porcentajeIva: 16,
        aplicaRetencion: false,
        otrosCargos: 30,
        estado: 'PAGADO'
    },
    {
        usuario: null,
        nroFactura: 'FAC-User-202412',
        mes: 12,
        anio: 2024,
        detalles: [
            { origen: 'RESIDENCIA', montoBase: 500, descripcion: 'Cuota diciembre' },
            { origen: 'EXTRA', montoBase: 75, descripcion: 'Ajuste anual' }
        ],
        porcentajeIva: 16,
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
