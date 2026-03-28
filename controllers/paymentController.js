const { response } = require('express');
const Payment = require('../models/payment');
const Facturacion = require('../models/facturacion');
const Notificacion = require('../models/notificacion');

const getPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .sort({ createdAt: -1 })
            .populate('cliente')
        payments.sort((a, b) => b.createdAt - a.createdAt);


        res.json({
            ok: true,
            payments
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener payments' });
    }
};

const getPaymentsByUser = async (req, res) => {
    const userId = req.params.id; // El ID del vendedor/admin que queremos consultar
    try {
        // Buscamos pagos donde este usuario aparezca en la repartición
        const payments = await Payment.find({
            $or: [
                { "reparticion.vendedor.id": userId },
                { "reparticion.admin.id": userId },
                { "reparticion.ceo.id": userId }
            ]
        }).populate('cliente', 'nombre email');

        res.json({ ok: true, payments });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al obtener reportes' });
    }
};

const createPayment = async (req, res) => {
    try {
        // Desestructuramos lo que viene de Angular
        const {
            amount,
            cliente,
            tipo_pago,
            referencia,
            vendedorId,
            adminId,
            ceoId,
            metodo_pago,
            bank_destino,
            fecha_verificacion,
            facturaId,
        } = req.body;

        // Validación de seguridad: que los IDs no vengan vacíos
        if (!vendedorId || !adminId || !ceoId) {
            return res.status(400).json({
                ok: false,
                msg: 'Faltan los IDs de los asociados para la repartición'
            });
        }

        const cuota = Number(amount) / 3;

        const payment = new Payment({
            cliente,
            amount: Number(amount),
            tipo_pago,
            referencia,
            metodo_pago,
            bank_destino,
            fecha_verificacion,
            factura: facturaId,
        });

        const paymentDB = await payment.save();

        res.json({
            ok: true,
            payment: paymentDB
        });

    } catch (error) {
        console.error(error); // Revisa la consola de Node para ver el error exacto
        res.status(500).json({
            ok: false,
            msg: 'Error interno en el servidor, revise los logs'
        });
    }
};

const getPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('cliente')
            .populate({
                path: 'reparticion.vendedor.id',
                select: 'username',
                model: 'Usuario'
            })
            .populate({
                path: 'reparticion.admin.id',
                select: 'username',
                model: 'Usuario'
            })
            .populate({
                path: 'reparticion.ceo.id',
                select: 'username',
                model: 'Usuario'
            })

        if (!payment) return res.status(404).json({ msg: 'payment not found' })
        res.json({
            ok: true,
            payment
        });

    } catch (error) {
        return res.status(404).json({ msg: 'payment not found' })
    }
};
const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findByIdAndDelete(req.params.id)
        if (!payment) return res.status(404).json({ msg: 'payment not found' })
        return res.sendStatus(204);
    } catch (error) {
        return res.status(404).json({ msg: 'payment not found' })
    }
};
const updatePayment = async (req, res) => {
    const id = req.params.id;
    try {
        const { amount, vendedorId, adminId, ceoId, ...rest } = req.body;

        let updateData = { ...rest };

        // Si se envió un nuevo monto, recalculamos la repartición
        if (amount) {
            const cuota = Number(amount) / 3;
            updateData.amount = Number(amount);
            updateData.reparticion = {
                vendedor: { id: vendedorId, monto: cuota },
                admin: { id: adminId, monto: cuota },
                ceo: { id: ceoId, monto: cuota }
            };
        }

        const payment = await Payment.findByIdAndUpdate(id, updateData, { new: true });

        if (!payment) return res.status(404).json({ ok: false, msg: 'Pago no encontrado' });

        res.json({ ok: true, payment });
    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al actualizar' });
    }
};

const updateStatus = async (req, res) => {
    const id = req.params.id;
    try {
        // 1. Actualizamos el pago
        const paymentDB = await Payment.findByIdAndUpdate(
            id,
            { status: true },
            { new: true }
        );

        if (!paymentDB) return res.status(404).json({ ok: false, msg: 'Pago no encontrado' });

        // 2. Si el pago tiene una factura asociada, la marcamos como PAGADA
        if (paymentDB.factura) {
            await Facturacion.findByIdAndUpdate(paymentDB.factura, { estado: 'PAGADO' });
        }

        res.status(200).json({ ok: true, payment: paymentDB });
    } catch (err) {
        res.status(500).json({ ok: false, msg: 'Error al procesar el pago' });
    }
};

const getMonthlyReport = async (req, res) => {
    try {
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);

        if (isNaN(month) || isNaN(year)) {
            return res.status(400).json({ ok: false, msg: "Mes y año requeridos" });
        }

        // 1. Buscamos todas las facturas PAGADAS de ese mes
        // (Podemos reportar sobre Facturacion para ver lo devengado o sobre Payment para ver lo recaudado)
        const report = await Facturacion.aggregate([
            {
                $match: {
                    mes: month,
                    anio: year,
                    estado: 'PAGADO' // Solo lo que ya entró a caja
                }
            },
            {
                $unwind: "$detalles" // Desglosamos cada concepto de la factura
            },
            {
                $group: {
                    _id: null,
                    // Totales por tipo de propiedad
                    totalResidencias: {
                        $sum: { $cond: [{ $eq: ["$detalles.origen", "RESIDENCIA"] }, "$detalles.montoBase", 0] }
                    },
                    totalOficinas: {
                        $sum: { $cond: [{ $eq: ["$detalles.origen", "OFICINA"] }, "$detalles.montoBase", 0] }
                    },
                    totalLocales: {
                        $sum: { $cond: [{ $eq: ["$detalles.origen", "LOCAL"] }, "$detalles.montoBase", 0] }
                    },
                    // Impuestos y Otros
                    totalIVA: { $sum: { $multiply: ["$detalles.montoBase", { $divide: ["$porcentajeIva", 100] }] } },
                    totalRetenciones: { $sum: "$retencionIva" },
                    totalOtrosCargos: { $sum: "$otrosCargos" },
                    // Gran Total Recaudado
                    recaudacionNeta: { $sum: "$totalPagar" } // Usando el campo que calculamos
                }
            }
        ]);

        // 2. También es útil saber cuánto falta por cobrar (Morosidad)
        const morosidad = await Facturacion.aggregate([
            { $match: { mes: month, anio: year, estado: 'PENDIENTE' } },
            { $group: { _id: null, montoPendiente: { $sum: "$totalPagar" }, cantidad: { $sum: 1 } } }
        ]);

        res.json({
            ok: true,
            periodo: `${month}-${year}`,
            recaudado: report[0] || { msg: "Sin recaudación este mes" },
            pendiente: morosidad[0] || { montoPendiente: 0, cantidad: 0 }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al generar reporte administrativo' });
    }
};

const validarPagoAdministrativo = async (req, res) => {
    const { id } = req.params; // ID del Pago
    const { nuevoEstado, motivoRechazo } = req.body; // 'APROBADO' o 'RECHAZADO'
    const adminId = req.uid; // ID del admin que valida (desde el middleware JWT)

    try {
        // 1. Buscamos el pago y su factura asociada
        const pago = await Payment.findById(id).populate('factura');
        if (!pago) return res.status(404).json({ ok: false, msg: 'Pago no encontrado' });

        let tituloNotif = '';
        let mensajeNotif = '';

        if (nuevoEstado === 'APROBADO') {
            // 2. Actualizamos el Pago
           pago.status = 'APROBADO';
            pago.usuario_validador = adminId;
            pago.fecha_pago = Date.now();
            await pago.save();

            if (pago.factura) {
                await Facturacion.findByIdAndUpdate(pago.factura._id, { estado: 'PAGADO' });
            }

            tituloNotif = '✅ Pago Aprobado';
            mensajeNotif = `Tu pago de ${pago.amount} ha sido verificado.`;
            
        } else {
            pago.status = 'RECHAZADO';
            pago.usuario_validador = adminId;
            await pago.save();

            tituloNotif = '❌ Pago Rechazado';
            mensajeNotif = `Motivo: ${motivoRechazo || 'Referencia no encontrada'}.`;
        }
        // 1. Guardar Notificación en BD
        const notif = new Notificacion({
            usuario: pago.cliente,
            titulo: tituloNotif,
            mensaje: mensajeNotif,
            tipo: nuevoEstado === 'APROBADO' ? 'PAGO_APROBADO' : 'PAGO_RECHAZADO',
            referenciaId: pago._id
        });

        await notif.save();

        // 2. Emitir por Socket (IMPORTANTE: usar pago.cliente)
        if (req.io) {
            req.io.to(pago.cliente.toString()).emit('notificacion-nueva', notif);
        }

        // 3. Enviar respuesta final
        res.json({
            ok: true,
            msg: nuevoEstado === 'APROBADO' ? 'Pago aprobado' : 'Pago rechazado',
            notificacion: notif
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al procesar la validación' });
    }
};

// enviar factura al cliente, agregado por José Prados
function enviarFactura(req, res) {
    // Verifica que se recibió el archivo
    if (!req.file) {
        return res.status(400).json({
            ok: false,
            message: 'No se recibió ningún archivo'
        });
    }

    // Configurar el correo con el archivo recibido
    const texto = `Hola ${req.body.nombrecliente}! Adjunto encontraras la factura de tu compra.`;
    const mailOptions = {
        from: `"Condominio Parque Central" <${process.env.USER_EMAIL}>`,
        to: req.body.emailcliente,
        subject: `¡Hola ${req.body.nombrecliente}! Te enviamos la factura de tu compra`,
        text: texto,
        attachments: [
            {
                filename: req.file.originalname,
                content: req.file.buffer,
            },
        ],
    };

    // enviar email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error al enviar el correo:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al enviar el correo, verifique el email del cliente por favor'
            });
        }
        else {
            console.log('Correo enviado: ' + info.response);
            res.json({
                ok: true,
                message: 'Correo enviado con éxito'
            });
        }
    })

}



module.exports = {
    createPayment,
    getPayment,
    getPayments,
    updatePayment,
    deletePayment,
    getPaymentsByUser,
    updateStatus,
    getMonthlyReport,
    validarPagoAdministrativo,
    enviarFactura


};