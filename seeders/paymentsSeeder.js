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
        await Payment.deleteMany({});

        const usuarios = await Usuario.find({ role: 'USER_ROLE' }).limit(3);
        const [juan, ana, carlos] = usuarios;

        const metodos = ['PAGO_MOVIL', 'ZELLE', 'TRANSFERENCIA', 'EFECTIVO'];
        const bancos = ['Banesco', 'Mercantil', 'Provincial', 'Caja'];
        const estados = ['APROBADO', 'PENDIENTE', 'RECHAZADO'];

        const paymentsData = [];

        // 1. Buscamos facturas existentes
        let facturas = await Facturacion.find();
        // 2. SI NO HAY FACTURAS, CREAMOS UNA DE PRUEBA RÁPIDA
        if (facturas.length === 0) {
            console.log('⚠️ Creando factura de respaldo para el seeder...');
            const nuevaFactura = new Facturacion({
                nroFactura: 'FAC-001-TEST',
                totalPagar: 1000,
                estado: 'PENDIENTE',
                cliente: usuarios[0]._id // Asignada al primer usuario
                
            });
            
            await nuevaFactura.save();
            facturas = [nuevaFactura]; // La metemos en el array para usarla
        }

        // Generamos 20 pagos para cada uno de los 3 usuarios (60 total)
        for (let i = 0; i < 60; i++) {
            const userIndex = Math.floor(i / 20); // 0-19 Juan, 20-39 Ana...
            const user = usuarios[userIndex];
            const metodo = metodos[i % metodos.length];
            const status = estados[i % estados.length];
            // Seleccionamos una factura al azar del array que ahora sí tiene datos
        const facturaAleatoria = facturas[i % facturas.length];

           paymentsData.push({
            amount: Math.floor(Math.random() * 500) + 100,
            metodo_pago: metodo,
            bank_destino: bancos[i % bancos.length],
            referencia: `${metodo.substring(0, 2)}-${user.username.toUpperCase()}-${1000 + i}`,
            status: status,
            tasaBCV: 36.5,
            cliente: user._id,
            factura: facturaAleatoria._id,
            fecha_pago: new Date(Date.now() - (i * 3600000 * 24)),
            img: `https://picsum.photos/200/300?random=${i}`,
            observaciones: "" // <--- AÑADE ESTO AQUÍ
        });
                }

        await Payment.insertMany(paymentsData);
        console.log('✅ 60 Payments insertados con referencias únicas');
        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        mongoose.connection.close();
    }
};

seedPayments();
