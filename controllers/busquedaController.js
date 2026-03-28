const { response } = require('express');
const Usuario = require('../models/usuario');
const Local = require('../models/local');
const Oficina = require('../models/oficina');
const Residencia = require('../models/residencia');
const Facturacion = require('../models/facturacion');

const getTodo = async(req, res = response) => {
    const busqueda = req.params.busqueda;
    const regex = new RegExp(busqueda, 'i');

    try {
        // Usamos $or para que busque en cualquiera de los campos
        const [usuarios, oficinas, locales, residencias] = await Promise.all([
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
            facturas
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
            default:
                return res.status(400).json({ ok: false, msg: 'Tabla no válida' });
        }

        res.json({ ok: true, resultados: data });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al buscar en la colección' });
    }
}

const getReporteMorosos = async (req, res) => {
    try {
        const reporte = await Facturacion.aggregate([
            { 
                $match: { estado: 'PENDIENTE' } 
            },
            {
                $group: {
                    _id: "$usuario",
                    totalDeuda: { $sum: "$totalPagar" }, // Suma del virtual o cálculo manual
                    cantidadFacturas: { $sum: 1 },
                    facturasDetalle: { $push: { nro: "$nroFactura", monto: "$totalPagar", mes: "$mes" } }
                }
            },
            {
                $lookup: { // Traemos los datos del usuario para saber quién es
                    from: 'usuarios',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'usuarioInfo'
                }
            },
            { $unwind: "$usuarioInfo" },
            {
                $project: {
                    _id: 0,
                    uid: "$_id",
                    username: "$usuarioInfo.username",
                    email: "$usuarioInfo.email",
                    totalDeuda: 1,
                    cantidadFacturas: 1,
                    facturasDetalle: 1
                }
            },
            { $sort: { totalDeuda: -1 } } // Los que más deben aparecen primero
        ]);

        // Calcular el gran total de deuda de todo el edificio
        const sumaGlobalDeuda = reporte.reduce((acc, user) => acc + user.totalDeuda, 0);

        res.json({
            ok: true,
            totalGlobalPendiente: sumaGlobalDeuda.toFixed(2),
            cantidadMorosos: reporte.length,
            morosos: reporte
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al generar reporte de morosos' });
    }
};

module.exports = {
    getTodo,
    getDocumentosColeccion,
    getReporteMorosos
}

