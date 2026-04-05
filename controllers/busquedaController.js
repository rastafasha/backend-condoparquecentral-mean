
const { response } = require('express');
const Usuario = require('../models/usuario');
const Local = require('../models/local');
const Oficina = require('../models/oficina');
const Residencia = require('../models/residencia');
const Facturacion = require('../models/facturacion');
const Payment = require('../models/payment');


const getTodo = async (req, res = response) => {
    const busqueda = req.params.busqueda;
    const regex = new RegExp(busqueda, 'i');

    try {
        // Usamos $or para que busque en cualquiera de los campos
        const [usuarios, oficinas, locales, residencias, payments, facturas] = await Promise.all([
            Usuario.find({
                $or: [{ username: regex }, { email: regex }]
            }).select('-password'), // No enviar contraseñas en búsquedas

            Oficina.find({
                $or: [{ edificio: regex }, { letra: regex }, { piso: regex }]
            }).populate('usuario', 'username email'),

            Local.find({
                $or: [{ edificio: regex }, { letra: regex }, { piso: regex }]
            }).populate('usuario', 'username email'),

            Residencia.find({
                $or: [{ edificio: regex }, { letra: regex }, { piso: regex }]
            }).populate('usuario', 'username email'),

            Payment.find({
                $or: [{ referencia: regex }, { amount: regex },
                { bank_destino: regex }, { status: regex }, { fecha_pago: regex },
                { metodo_pago: regex }, { cliente: regex }
                ]
            }).populate('usuario', 'username email'),
            

            Facturacion.find({
                $or: [
                    { nroFactura: regex },
                    { estado: regex }
                ]
            }).populate('usuario', 'username email')
        ]);

        res.json({
            ok: true,
            usuarios,
            oficinas,
            locales,
            residencias,
            facturas,
            payments
        });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error en la búsqueda' });
    }
}

const getDocumentosColeccion = async (req, res = response) => {

    const tabla = req.params.tabla;
    const busqueda = req.params.busqueda;
    const regex = new RegExp(busqueda, 'i');
    const esNumero = !isNaN(busqueda); // Verificamos si la búsqueda es un número

    try {
        let data = [];

        switch (tabla) {
            case 'usuarios':
                data = await Usuario.find({
                    $or: [{ username: regex }, { email: regex }]
                }).select('-password');
                break;

            case 'oficinas':
            case 'locales':
            case 'residencias':
                const modelosPropiedad = { oficinas: Oficina, locales: Local, residencias: Residencia };
                data = await modelosPropiedad[tabla].find({
                    $or: [{ edificio: regex }, { letra: regex }, { piso: regex }]
                }).populate('usuario', 'username email');
                break;

            case 'facturaciones':
                // Buscamos solo en campos físicos de la base de datos
                const queryFactura = {
                    $or: [
                        { nroFactura: regex },
                        { estado: regex }
                    ]
                };

                // El año suele ser un campo físico (Number), así que lo incluimos si es número
                if (esNumero) {
                    queryFactura.$or.push({ anio: Number(busqueda) });
                }

                data = await Facturacion.find(queryFactura)
                    .populate('usuario', 'username email');
                break;



            case 'payments':
                // 1. Campos de texto (referencia, banco, status)
                // Si 'referencia' es String en la DB, el regex funciona para "A123" o "123"
                let queryPayment = {
                    $or: [
                        { referencia: regex },
                        { bank_destino: regex },
                        { status: regex }
                    ]
                };

                // 2. Solo si es número, buscamos en el monto (amount)
                if (esNumero) {
                    queryPayment.$or.push({ amount: Number(busqueda) });
                }

                // 3. Búsqueda por CLIENTE (Relación con Usuario)
                const usuariosEncontrados = await Usuario.find({ username: regex });
                if (usuariosEncontrados.length > 0) {
                    const idsUsuarios = usuariosEncontrados.map(u => u._id);
                    queryPayment.$or.push({ cliente: { $in: idsUsuarios } });
                }

                // 4. Ejecutar la búsqueda final
                data = await Payment.find(queryPayment)
                    .populate('cliente', 'username email');
                break;


            default:
                return res.status(400).json({ ok: false, msg: 'Tabla no válida' });
        }

        res.json({ ok: true, resultados: data });

    } catch (error) {
        console.error("ERROR EN BUSQUEDA:", error);
        res.status(500).json({ ok: false, msg: 'Error al buscar en la colección' });
    }
}


module.exports = {
    getTodo,
    getDocumentosColeccion,
}

