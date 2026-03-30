const mongoose = require('mongoose');
require('dotenv').config();
const Transferencia = require('../models/transferencia');
const Usuario = require('../models/usuario');
const Facturacion = require('../models/facturacion');

const transferenciasDataTemplate = [
    // Juan - 4 transferencias
    { metodo_pago: 'PAGO_MOVIL', bankName: 'Banesco', amount: 850, referencia: 'TRF-JUAN-001', status: 'PENDING', tasaBCV: 35.5 },
    { metodo_pago: 'ZELLE', bankName: 'Mercantil', amount: 1200.5, referencia: 'TRF-JUAN-002', status: 'APPROVED', tasaBCV: 35.5 },
    { metodo_pago: 'PAGO_MOVIL', bankName: 'Banesco', amount: 650.75, referencia: 'TRF-JUAN-003', status: 'REJECTED', tasaBCV: 35.5 },
    { metodo_pago: 'TRANSFERENCIA', bankName: 'Provincial', amount: 950.25, referencia: 'TRF-JUAN-004', status: 'PENDING', tasaBCV: 35.5 },
    
    // Ana - 4 transferencias
    { metodo_pago: 'PAGO_MOVIL', bankName: 'Provincial', amount: 700, referencia: 'TRF-ANA-005', status: 'APPROVED', tasaBCV: 35.5 },
    { metodo_pago: 'TRANSFERENCIA', bankName: 'Banesco', amount: 1100, referencia: 'TRF-ANA-006', status: 'PENDING', tasaBCV: 35.5 },
    { metodo_pago: 'ZELLE', bankName: 'Mercantil', amount: 550.3, referencia: 'TRF-ANA-007', status: 'APPROVED', tasaBCV: 35.5 },
    { metodo_pago: 'PAGO_MOVIL', bankName: 'Banesco', amount: 825.8, referencia: 'TRF-ANA-008', status: 'REJECTED', tasaBCV: 35.5 },
    
    // Carlos - 4 transferencias
    { metodo_pago: 'ZELLE', bankName: 'Venezuela', amount: 1300, referencia: 'TRF-CARLOS-009', status: 'PENDING', tasaBCV: 35.5 },
    { metodo_pago: 'PAGO_MOVIL', bankName: 'Banesco', amount: 925.5, referencia: 'TRF-CARLOS-010', status: 'APPROVED', tasaBCV: 35.5 },
    { metodo_pago: 'EFECTIVO', bankName: 'Caja Admin', amount: 725.25, referencia: 'TRF-CARLOS-011', status: 'PENDING', tasaBCV: 35.5 },
    { metodo_pago: 'TRANSFERENCIA', bankName: 'Provincial', amount: 1150.75, referencia: 'TRF-CARLOS-012', status: 'APPROVED', tasaBCV: 35.5 }
];

const seedTransferencias = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO);
        console.log('✅ Conectado - Actualizando seeder para nuevo modelo Transferencia');

        await Transferencia.deleteMany({});
        console.log('✅ Transferencias existentes eliminadas');

        // Obtener propietarios y facturas PENDIENTE
        const propietarios = await Usuario.find({ role: 'USER_ROLE' }).limit(3);
        if (propietarios.length < 3) throw new Error('Requiere 3 USER_ROLE propietarios');
        const [juan, ana, carlos] = propietarios;

        const facturasPendientes = await Facturacion.find({ estado: 'PENDIENTE' });
        console.log(`📋 ${facturasPendientes.length} facturas PENDIENTE disponibles`);

        // Generar datos linked
        const transferenciasData = transferenciasDataTemplate.map((tmpl, index) => {
            const userIndex = Math.floor(index / 4);
            const users = [juan, ana, carlos];
            const factura = facturasPendientes[Math.floor(Math.random() * facturasPendientes.length)] || null;

            return {
                ...tmpl,
                user: users[userIndex]._id,
                factura: factura?._id || new mongoose.Types.ObjectId(),
                img: `https://picsum.photos/200/300?random=${index + 1}`,
                paymentday: new Date(Date.now() - Math.random() * 30 * 86400000) // 30 días atrás
            };
        });


        const transferenciasGuardadas = await Transferencia.insertMany(transferenciasData);
        console.log('✅ 12 Transferencias insertadas con nuevo schema');

        // Logs detallados
        const conPopulate = await Transferencia.find()
            .populate('user', 'username email')
            .populate('factura', 'nroFactura totalPagar');
        
        conPopulate.forEach((t, i) => {
            console.log(`  ${i+1}. ${t.referencia}`);
            console.log(`     User: ${t.user.username} | Factura: ${t.factura?.nroFactura || 'N/A'}`);
            console.log(`     $${t.amount} ${t.metodo_pago} (${t.bankName}) | ${t.status}`);
            console.log('');
        });

        mongoose.connection.close();
        console.log('🎉 Seeder actualizado y ejecutado correctamente');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedTransferencias();
