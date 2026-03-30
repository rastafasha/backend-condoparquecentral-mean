const mongoose = require('mongoose');
require('dotenv').config();
const Payment = require('../models/payment');
const Facturacion = require('../models/facturacion');
const Usuario = require('../models/usuario');

const paymentsDataTemplate = [
    // Templates para Superadmin (se asignarán factura/cliente dinámicamente)
    {
        amount: 978,
        metodo_pago: 'PAGO_MOVIL',
        bank_destino: 'Banesco',
        referencia: 'PM-SUPER-001',
        status: 'APROBADO',
        tasaBCV: 35.5
    },
    {
        amount: 621,
        metodo_pago: 'ZELLE',
        bank_destino: 'Mercantil',
        referencia: 'ZELLE-SUPER-002',
        status: 'PENDIENTE',
        tasaBCV: 35.5,
    },
    {
        amount: 812,
        metodo_pago: 'TRANSFERENCIA',
        bank_destino: 'Provincial',
        referencia: 'TRF-SUPER-003',
        status: 'APROBADO',
        tasaBCV: 35.5
    },
    {
        amount: 605,
        metodo_pago: 'EFECTIVO',
        bank_destino: 'Caja Admin',
        referencia: 'EF-SUPER-004',
        status: 'RECHAZADO',
        tasaBCV: 35.5
    },

    // Admin
    {
        amount: 588,
        metodo_pago: 'PAGO_MOVIL',
        bank_destino: 'Banesco',
        referencia: 'PM-ADMIN-005',
        status: 'PENDIENTE',
        tasaBCV: 35.5
    },
    {
        amount: 406,
        metodo_pago: 'ZELLE',
        bank_destino: 'Venezuela',
        referencia: 'ZELLE-ADMIN-006',
        status: 'APROBADO',
        tasaBCV: 35.5
    },
    {
        amount: 605,
        metodo_pago: 'TRANSFERENCIA',
        bank_destino: 'Banesco',
        referencia: 'TRF-ADMIN-007',
        status: 'APROBADO',
        tasaBCV: 35.5
    },
    {
        amount: 588,
        metodo_pago: 'EFECTIVO',
        bank_destino: 'Caja',
        referencia: 'EF-ADMIN-008',
        status: 'PENDIENTE',
        tasaBCV: 35.5
    },

    // User
    {
        amount: 812,
        metodo_pago: 'PAGO_MOVIL',
        bank_destino: 'Mercantil',
        referencia: 'PM-USER-009',
        status: 'APROBADO',
        tasaBCV: 35.5
    },
    {
        amount: 610,
        metodo_pago: 'ZELLE',
        bank_destino: 'Banesco',
        referencia: 'ZELLE-USER-010',
        status: 'APROBADO',
        tasaBCV: 35.5
    },
    {
        amount: 607,
        metodo_pago: 'TRANSFERENCIA',
        bank_destino: 'Provincial',
        referencia: 'TRF-USER-011',
        status: 'PENDIENTE',
        tasaBCV: 35.5
    },
    {
        amount: 812,
        metodo_pago: 'EFECTIVO',
        bank_destino: 'Admin',
        referencia: 'EF-USER-012',
        status: 'RECHAZADO',
        tasaBCV: 35.5
    }
];

const seedPayments = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO);
        console.log('✅ Conectado a la base de datos');

        // Eliminar payments existentes
        await Payment.deleteMany({});
        console.log('✅ Payments existentes eliminados');

        // Verificar dependencias
        const usuariosPropietarios = await Usuario.find({ role: 'USER_ROLE' }).limit(3);
        if (usuariosPropietarios.length < 3) throw new Error('Ejecuta usuarioSeeder.js - necesita 3 USER_ROLE');
        const [juan, ana, carlos] = usuariosPropietarios;

        const facturasPendientes = await Facturacion.find({ estado: 'PENDIENTE' });
        if (facturasPendientes.length === 0) {
            console.log('⚠️  No hay facturas PENDIENTE. Creando algunos payments de ejemplo anyway.');
        }

        // Asignar factura y cliente dinámicamente
        const paymentsData = paymentsDataTemplate.map((tmpl, index) => {
            const userIndex = Math.floor(index / 4);
            const users = [juan, ana, carlos];
            const factura = facturasPendientes[Math.floor(Math.random() * facturasPendientes.length)] || null;

            return {
                ...tmpl,
                cliente: users[userIndex]._id,
                factura: factura?._id || new mongoose.Types.ObjectId(),
                img: `https://picsum.photos/200/300?random=${index + 1}`,
            };
        });

        const paymentsGuardados = await Payment.insertMany(paymentsData);
        console.log('✅ 12 Payments insertados correctamente');

        // Logs detallados con populate
        const paymentsConDetalle = await Payment.find()
            .populate('cliente', 'username email')
            .populate('factura', 'nroFactura totalPagar estado')
            .populate('usuario_validador', 'username');
        
        paymentsConDetalle.forEach((payment, index) => {
            console.log(`   ${index + 1}. Ref: ${payment.referencia}`);
            console.log(`      Cliente: ${payment.cliente?.username} (${payment.cliente?.email})`);
            console.log(`      Monto: $${payment.amount.toFixed(2)} | Método: ${payment.metodo_pago}`);
            console.log(`      Status: ${payment.status} | Factura: ${payment.factura?.nroFactura || 'Sin factura'}`);
            console.log(`      ID Cliente: ${payment.cliente?._id}`);
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

seedPayments();
