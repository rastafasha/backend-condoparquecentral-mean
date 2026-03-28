const Facturacion = require('../models/facturacion');
const Profile = require('../models/profile');

const generarFacturaDinamica = async (req, res) => {
    try {
        const { usuarioId, mes, anio, porcentajeIva, aplicaRetencion, montoRetencion, otrosCargos } = req.body;

        const perfil = await Profile.findOne({ usuario: usuarioId })
            .populate('residencia oficina local');

        if (!perfil) return res.status(404).json({ ok: false, msg: 'Perfil no existe' });

        const detalles = [];

        // Función auxiliar para procesar cada array de propiedades
        const procesarPropiedades = (propiedades, tipo) => {
            propiedades.forEach(p => {
                detalles.push({
                    origen: tipo,
                    propiedadId: p._id,
                    montoBase: p.montoMensual, // <--- Toma el monto real del modelo
                    descripcion: `${tipo}: ${p.edificio} - ${p.letra} (Piso/Nivel: ${p.piso})`
                });
            });
        };

        procesarPropiedades(perfil.residencia, 'RESIDENCIA');
        procesarPropiedades(perfil.oficina, 'OFICINA');
        procesarPropiedades(perfil.local, 'LOCAL');

        const factura = new Facturacion({
            usuario: usuarioId,
            nroFactura: `FAC-${Date.now()}`, 
            mes, anio, detalles, porcentajeIva, aplicaRetencion, 
            montoRetencion: aplicaRetencion ? montoRetencion : 0,
            otrosCargos
        });

        await factura.save();
        res.json({ ok: true, factura });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al generar' });
    }
};

const generarFacturacionMensualMasiva = async (req, res) => {
    try {
        const { mes, anio, porcentajeIva } = req.body; // Parámetros globales del mes

        // 1. Buscamos TODOS los perfiles que tengan al menos una propiedad
        const perfiles = await Profile.find()
            .populate('usuario residencia oficina local');

        let facturasCreadas = 0;

        // 2. Recorremos cada perfil para armar su factura
        for (let perfil of perfiles) {
            //  Armamos el arreglo de detalles recorriendo lo que TENGA el perfil
            const detalles = [];

            //Si tiene residencias, las sumamos
            // Sumamos montos de Residencias
            perfil.residencia.forEach(r => {
                detalles.push({ origen: 'RESIDENCIA', propiedadId: r._id, montoBase: r.montoMensual, descripcion: `Edif. ${r.edificio} - Piso ${r.piso}` });
            });
            // Si tiene oficinas, las sumamos
            // Sumamos montos de Oficinas
            perfil.oficina.forEach(o => {
                detalles.push({ origen: 'OFICINA', propiedadId: o._id, montoBase: o.montoMensual, descripcion: `Edif. ${o.edificio} - Ofic. ${o.letra}` });
            });
            // Si tiene Locales, las sumamos
            // Sumamos montos de Locales
            perfil.local.forEach(l => {
                detalles.push({ origen: 'LOCAL', propiedadId: l._id, montoBase: l.montoMensual, descripcion: `Edif. ${l.edificio} - Local ${l.letra}` });
            });

            // Solo creamos factura si el usuario tiene propiedades cargadas
            //VALIDACIÓN CRUCIAL: Solo guardamos la factura si el arreglo NO está vacío
            if (detalles.length > 0) {
                const nuevaFactura = new Facturacion({
                    usuario: perfil.usuario._id,
                    nroFactura: `PC-${anio}${mes}-${perfil.usuario._id.toString().slice(-4)}-${Date.now()}`,
                    mes,
                    anio,
                    detalles,
                    porcentajeIva,
                    aplicaRetencion: false, // Por defecto false, administración lo ajusta luego si hace falta
                    estado: 'PENDIENTE'
                });

                await nuevaFactura.save();
                facturasCreadas++;
            }
        }

        res.json({
            ok: true,
            msg: `Proceso completado. Se generaron ${facturasCreadas} facturas.`
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error en el proceso masivo' });
    }
};

const getFacturaciones = async(req, res) => {

    const facturas = await Facturacion.find()
    res.json({
        ok: true,
        facturas
    });
};


const getFactura = async(req, res) => {

    const id = req.params.id;


    Facturacion.findById(id, {})
        .exec((err, factura) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Factura',
                    errors: err
                });
            }
            if (!factura) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'La Factura con el id ' + id + 'no existe',
                    errors: { message: 'No existe una Factura con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                factura: factura
            });
        });


    
};


module.exports = {
    generarFacturaDinamica,
    generarFacturacionMensualMasiva,
    getFacturaciones,
    getFactura
};
