const { response } = require('express');
const Payment = require('../models/payment');
const Facturacion = require('../models/facturacion');
const Notificacion = require('../models/notificacion');
const PushSubscription = require('../models/push-subscription');

const getPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .sort({ createdAt: -1 })
            .populate('cliente')
            .populate('factura')
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
    const userId = req.params.id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        // 1. Definimos la consulta: solo pagos donde el cliente sea el userId
        const query = { cliente: userId };

        // 2. Ejecutamos búsqueda y conteo en paralelo para mejor rendimiento
        const [payments, total] = await Promise.all([
            Payment.find(query)
                .populate('cliente', 'username email numdoc') // Datos del usuario
                .populate('factura', 'nroFactura')           // Datos de la factura
                .sort({ fecha_pago: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Payment.countDocuments(query)
        ]);

        res.json({
            ok: true,
            payments,
            total,
            pages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('Error en getPaymentsByUser:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener los pagos del usuario' });
    }
};


const createPayment = async (req, res) => {
    try {
        const {
            amount,
            cliente,
            metodo_pago,
            bank_destino,
            referencia,
            tasaBCV,
            factura,
            img: imgURL // Capturamos si viene la URL directamente en el body
        } = req.body;

        // 1. Declarar la variable img para que sea accesible
        let img = '';

        // 2. Si viene un archivo (Multer/Cloudinary)
        if (req.file) {
            img = req.file.path || req.file.secure_url; 
        } 
        // 3. Si no viene archivo pero viene la URL en el body (ej. desde Cloudinary en Angular)
        else if (imgURL) {
            img = imgURL;
        }

        // 4. Creamos el nuevo pago con la variable 'img' ya definida
        const payment = new Payment({
            amount: Number(amount),
            cliente,
            metodo_pago,
            bank_destino,
            referencia,
            tasaBCV: Number(tasaBCV),
            factura,
            img, // Ahora 'img' siempre existe (aunque sea un string vacío)
            status: 'PENDIENTE'
        });

        const paymentDB = await payment.save();

        res.json({
            ok: true,
            payment: paymentDB
        });

    } catch (error) {
        console.error('Error en createPayment:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error al procesar el pago'
        });
    }
};


const getPayment = async (req, res) => {
    const id = req.params.id;

    try {
        const payment = await Payment.findById(id)
            .populate('factura') // Nombre correcto según tu Schema
            .populate('cliente', 'username email numdoc') // Traemos datos básicos del cliente
            .populate('usuario_validador', 'username'); // Traemos quién aprobó

        if (!payment) {
            return res.status(404).json({
                ok: false,
                msg: 'El pago no existe en la base de datos'
            });
        }

        res.json({
            ok: true,
            payment
        });

    } catch (error) {
        console.log(error);
        // Si el ID no tiene el formato correcto de MongoDB, cae aquí
        return res.status(500).json({
            ok: false,
            msg: 'Error al buscar el pago, verifique el ID'
        });
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


const getMonthlyReport = async (req, res) => {
    try {
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);

        if (isNaN(month) || isNaN(year)) {
            return res.status(400).json({ ok: false, msg: "Mes y año requeridos" });
        }

        const report = await Facturacion.aggregate([
            { $match: { mes: month, anio: year, estado: 'PAGADO' } },
            {
                $group: {
                    _id: null,
                    totalResidencias: {
                        $sum: {
                            $reduce: {
                                input: "$detalles",
                                initialValue: 0,
                                in: { $add: ["$$value", { $cond: [{ $eq: ["$$this.origen", "RESIDENCIA"] }, "$$this.montoBase", 0] }] }
                            }
                        }
                    },
                    totalIVA: { $sum: { $sum: "$detalles.montoIva" } },
                    totalOtros: { $sum: "$otrosCargos" },
                    // Cálculo manual del total ya que el virtual no funciona en aggregate
                    recaudacionNeta: {
                        $sum: {
                            $subtract: [
                                { $add: [{ $sum: "$detalles.montoBase" }, { $sum: "$detalles.montoIva" }, "$otrosCargos"] },
                                "$montoRetencion"
                            ]
                        }
                    }
                }
            }
        ]);

        const morosidad = await Facturacion.aggregate([
            { $match: { mes: month, anio: year, estado: 'PENDIENTE' } },
            {
                $group: {
                    _id: null,
                    montoPendiente: {
                        $sum: { $add: [{ $sum: "$detalles.montoBase" }, { $sum: "$detalles.montoIva" }, "$otrosCargos"] }
                    },
                    cantidad: { $sum: 1 }
                }
            }
        ]);

        res.json({
            ok: true,
            recaudado: report[0] || { recaudacionNeta: 0, totalResidencias: 0, totalIVA: 0 },
            pendiente: morosidad[0] || { montoPendiente: 0, cantidad: 0 }
        });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error en reporte' });
    }
};

const validarPagoAdministrativo = async (req, res) => {
    const { id } = req.params;
    // 1. IMPORTANTE: Extraemos 'observaciones' que es lo que envías desde el front
    const { nuevoEstado, observaciones } = req.body;
    const adminId = req.uid;

    try {
        const pago = await Payment.findById(id).populate('factura');
        if (!pago) return res.status(404).json({ ok: false, msg: 'Pago no encontrado' });

        // 2. Actualizamos campos comunes
        pago.status = nuevoEstado;
        pago.usuario_validador = adminId;
        // Guardamos el texto que viene del front en el campo del modelo
        pago.observaciones = observaciones || '';

        if (nuevoEstado === 'APROBADO') {
            pago.status = 'APROBADO';
            pago.fecha_pago = Date.now();

            if (pago.factura) {
                // 1. APROBAR: Factura pasa a PAGADO
                await Facturacion.findByIdAndUpdate(pago.factura._id, { estado: 'PAGADO' });
            }
        } else if (nuevoEstado === 'RECHAZADO') {
            pago.status = 'RECHAZADO';

            if (pago.factura) {
                // 2. RECHAZAR (Arrepentimiento): Factura vuelve a PENDIENTE
                await Facturacion.findByIdAndUpdate(pago.factura._id, { estado: 'PENDIENTE' });
            }
        }

        await pago.save();

        // 3. Configurar Notificación Dinámica
        const esAprobado = nuevoEstado === 'APROBADO';
        const tituloNotif = esAprobado ? '✅ Pago Aprobado' : '❌ Pago Rechazado';

        // Si es rechazado, usamos las observaciones enviadas
        const mensajeNotif = esAprobado
            ? `Tu pago de ${pago.amount} ha sido verificado.`
            : `Motivo: ${observaciones || 'Datos incorrectos'}`;

        const notif = new Notificacion({
            usuario: pago.cliente,
            titulo: tituloNotif,
            mensaje: mensajeNotif,
            tipo: esAprobado ? 'PAGO_APROBADO' : 'PAGO_RECHAZADO',
            referenciaId: pago._id
        });

        await notif.save();

        // 4. Emitir por Socket
        if (req.io) {
            req.io.to(pago.cliente.toString()).emit('notificacion-nueva', notif);
        }

        res.json({
            ok: true,
            msg: esAprobado ? 'Pago aprobado' : 'Pago rechazado',
            payment: pago,
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
    const texto = `Hola ${req.body.nombrecliente}! Adjunto encontraras la factura de tu pago.`;
    const mailOptions = {
        from: `"Soporte Condo App Parque Central" <${process.env.USER_EMAIL}>`,
        to: req.body.emailcliente,
        subject: `¡Hola ${req.body.nombrecliente}! Te enviamos la factura de tu pago`,
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
const listarPaymentPorStatus = async (req, res) => {
    var status = req.params['status'];
    try {
        // First, find the category by name
        const payment = await Payment.findOne({ status: status });

        if (!payment) {
            return res.status(404).json({ message: 'Pago no encontrado' });
        }

        // Then, find projects using the category's ObjectId
        const payments = await Payment.find({ status: status });

        res.status(200).send({ payments: payments });
    } catch (err) {
        res.status(500).send({ error: err });
    }
}



module.exports = {
    createPayment,
    getPayment,
    getPayments,
    updatePayment,
    deletePayment,
    getPaymentsByUser,
    getMonthlyReport,
    validarPagoAdministrativo,
    enviarFactura,
    listarPaymentPorStatus


};