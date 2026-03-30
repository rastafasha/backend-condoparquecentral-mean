const { response } = require('express');
const Usuario = require('../models/usuario');
const Local = require('../models/local');
const Oficina = require('../models/oficina');
const Residencia = require('../models/residencia');
const Facturacion = require('../models/facturacion');
const Payment = require('../models/payment');
const Trasferencia = require('../models/transferencia');

const getTodo = async(req, res = response) => {
    const busqueda = req.params.busqueda;
    const regex = new RegExp(busqueda, 'i');

    try {
        // Usamos $or para que busque en cualquiera de los campos
        const [usuarios, oficinas, locales, residencias, payments,trasnferencias] = await Promise.all([
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
                    { metodo_pago: regex },
                ] 
            }).populate('usuario', 'username email'),
            Transferencia.find({ 
                $or: [{ referencia: regex }, { amount: regex }, 
                    { bankName: regex }, { status: regex }, { fecha_pago: regex },
                    { metodo_pago: regex },
                ] 
            }),

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
            payments,
            trasnferencias
        });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error en la búsqueda' });
    }
}

const getDocumentosColeccion = async(req, res = response) => {
    const tabla = req.params.tabla;
    const busqueda = req.params.busqueda;
    const regex = new RegExp(busqueda, 'i');

    try {
        let data = [];

        switch (tabla) {
            case 'usuarios':
                data = await Usuario.find({ $or: [{ username: regex }, { email: regex }] }).select('-password');
                break;
            case 'oficinas':
            case 'locales':
            case 'residencias':
                const modelosPropiedad = { oficinas: Oficina, locales: Local, residencias: Residencia };
                data = await modelosPropiedad[tabla].find({ 
                    $or: [{ edificio: regex }, { letra: regex }, { piso: regex }] 
                }).populate('usuario', 'username email');
                break;
            case 'facturaciones': // <-- Caso para facturas
                data = await Facturacion.find({ 
                    $or: [{ nroFactura: regex }, { estado: regex }] 
                }).populate('usuario', 'username email');
                break;
            case 'payments': // <-- Caso para facturas
                data = await Payment.find({ 
                    $or: [{ referencia: regex }, { amount: regex }, 
                    { bank_destino: regex }, { status: regex }, { fecha_pago: regex }] 
                }).populate('usuario', 'username email');
                break;
            case 'transferencias': // <-- Caso para transferencias
                data = await Transferencia.find({ 
                    $or: [{ referencia: regex }, { amount: regex }, 
                    { bankName: regex }, { status: regex }, { fecha_pago: regex }] 
                }).populate('usuario', 'username email');
                break;
            default:
                return res.status(400).json({ ok: false, msg: 'Tabla no válida' });
        }

        res.json({ ok: true, resultados: data });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al buscar en la colección' });
    }
}


module.exports = {
    getTodo,
    getDocumentosColeccion,
}

