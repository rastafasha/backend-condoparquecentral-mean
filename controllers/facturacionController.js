const Facturacion = require('../models/facturacion');
const Profile = require('../models/profile');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const Tasabcv = require('../models/tasabcv');
const getFacturaciones = async (req, res) => {

    const facturas = await Facturacion.find()
        .sort({ createdAt: -1 })
    res.json({
        ok: true,
        facturas
    });
};


const getFactura = async (req, res) => {

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
const generarFacturaDinamica = async (req, res) => {
    try {
        const { usuario, mes, anio, porcentajeIva, aplicaRetencion, montoRetencion, otrosCargos, tipoInmueble, indexUnidad } = req.body;


        const perfil = await Profile.findOne({ usuario }).populate('residencia oficina local');
        if (!perfil) return res.status(404).json({ ok: false, msg: 'Perfil no existe' });

        const detalles = [];
        const origenFrontend = (req.body.detalles && req.body.detalles.length > 0)
            ? req.body.detalles[0].origen
            : 'RESIDENCIA'; // Valor por defecto si viene vacío
        const procesarPropiedades = (propiedades, tipoEtiqueta) => {
            if (!propiedades || !Array.isArray(propiedades)) return;

            propiedades.forEach(p => {
                detalles.push({
                    origen: origenFrontend, // Usamos el que determinamos arriba
                    propiedadId: p._id,
                    montoBase: Number(p.montoMensual) || 0,
                    descripcion: `${tipoEtiqueta}: ${p.edificio || ''} - ${p.letra || ''}`
                });
            });
        };

        if (origenFrontend === 'RESIDENCIA') procesarPropiedades(perfil.residencia, 'Residencia');
        if (origenFrontend === 'OFICINA') procesarPropiedades(perfil.oficina, 'Oficina');
        if (origenFrontend === 'LOCAL') procesarPropiedades(perfil.local, 'Local');

        const factura = new Facturacion({
            usuario,
            nroFactura: `FAC-${Date.now()}`,
            mes, anio, detalles, porcentajeIva,
            aplicaRetencion: Boolean(aplicaRetencion),
            montoRetencion: aplicaRetencion ? (Number(montoRetencion) || 0) : 0,
            otrosCargos: Number(otrosCargos) || 0
        });

        const facturaGuardada = await factura.save();
        // 1. Unimos el nombre del perfil
        const nombreCompleto = `${perfil.first_name} ${perfil.last_name}`;
        // 2. Extraemos el identificador del inmueble (Edificio + Letra/Número)
        // Buscamos en residencia, oficina o local según lo que tenga el perfil
        // Accedemos dinámicamente al array correcto y a la posición correcta
        // Si el frontend envía 'RESIDENCIA' en mayúsculas, 
        // conviértelo a minúsculas para que coincida con las llaves del objeto perfil
        const keyPerfil = origenFrontend.toLowerCase();

        const unidadesDeEsteTipo = perfil[keyPerfil]; 
        const unidad = (unidadesDeEsteTipo && unidadesDeEsteTipo.length > 0) ? unidadesDeEsteTipo[0] : null;

        const identificadorInmueble = unidad 
            ? `${origenFrontend}: ${unidad.edificio} - ${unidad.letra}` 
            : 'N/A';


        // 1. Buscamos la tasa BCV del día para convertir a dólares (si el PDF la necesita)
        // 2. BUSCAR LA TASA EN LA BASE DE DATOS (No dependas del front)
        const tasaData = await Tasabcv.findOne().sort({ createdAt: -1 });
        const precioDolar = tasaData ? tasaData.precio_dia : 1; // Si no hay tasa, usamos 1 para no romper


        // 3. Enviamos al PDF el objeto enriquecido

        const prefijos = {
            residencia: 'RES',
            oficina: 'OFI',
            local: 'LOC'
        };
        const prefijo = prefijos[tipoInmueble] || 'GEN'; // GEN por si acaso
        const dataParaPDF = {
            ...facturaGuardada._doc,
            usuarioNombre: nombreCompleto,
            inmueble: identificadorInmueble, // <-- Esto es lo que leerá el PDF
            tasaBCV: precioDolar,
            prefijo: prefijo// <--- Pasamos la tasa al PDF
        };

        // IMPORTANTE: NO uses res.json() aquí.
        // Llamamos directamente a la función que envía el archivo.
        return escribirPDF(dataParaPDF, res);

    } catch (error) {
        console.error("ERROR EN BACKEND:", error);
        // Solo enviamos JSON si el PDF aún no ha empezado a escribirse
        if (!res.headersSent) {
            res.status(500).json({ ok: false, msg: 'Error interno al generar' });
        }
    }
};


const escribirPDF = (data, res) => {
    const doc = new PDFDocument({ margin: 30, size: 'LETTER' });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // --- ENCABEZADO (Igual al tuyo) ---
    doc.fontSize(14).font('Helvetica-Bold').text('CORPOCAPITAL', { align: 'center' });
    doc.fontSize(8).font('Helvetica').text('RIF: G-20010665-4', { align: 'center' });
    doc.text('Complejo Residencial Parque Central', { align: 'center' });
    doc.moveDown();

    // --- DATOS DEL CLIENTE ---
    doc.rect(30, 80, 550, 50).stroke();
    doc.fontSize(9);
    doc.text(`NOMBRE: ${data.usuarioNombre}`, 40, 90);
    doc.text(`INMUEBLE: ${data.inmueble}`, 40, 105);
    doc.text(`FECHA EMISIÓN: ${new Date().toLocaleDateString()}`, 420, 90);
    doc.text(`RECIBO N°: ${data.nroFactura}`, 420, 105);

    // --- TABLA DE GASTOS ---
    const tableTop = 150;
    doc.rect(30, tableTop, 550, 20).fill('#eeeeee').stroke();
    doc.fillColor('black').font('Helvetica-Bold').fontSize(8);
    doc.text('CONCEPTO', 40, tableTop + 7);
    doc.text('GASTO GENERAL', 250, tableTop + 7, { width: 100, align: 'center' });
    doc.text('GASTO EDIFICIO', 350, tableTop + 7, { width: 100, align: 'center' });
    doc.text('CUOTA APTO', 480, tableTop + 7, { width: 100, align: 'right' });

    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(8);

    (data.detalles || []).forEach(item => {
        doc.text(item.descripcion.substring(0, 45), 40, y);
        doc.text(`---`, 250, y, { width: 100, align: 'center' });
        doc.text(`---`, 350, y, { width: 100, align: 'center' });
        doc.font('Helvetica-Bold').text(`Bs. ${item.montoBase.toFixed(2)}`, 480, y, { width: 100, align: 'right' });

        y += 15;
        doc.moveTo(30, y).lineTo(580, y).dash(1, { space: 2 }).stroke().undash();
        y += 5;
    });

    // --- TOTALES (CORRECCIONES AQUÍ) ---
    const subtotal = data.detalles.reduce((acc, i) => acc + i.montoBase, 0);
    const iva = (subtotal * (data.porcentajeIva / 100));
    const fondoReserva = subtotal * 0.05;

    // 1. CORRECCIÓN: Usar data.otrosCargos y data.montoRetencion (nombres correctos del objeto)
    const totalBs = subtotal + iva + (data.otrosCargos || 0) + fondoReserva - (data.montoRetencion || 0);

    // 2. CORRECCIÓN: Validar que tasaBCV no sea 0 para no romper el código
    const tasa = data.tasaBCV || 1;
    const totalUSD = totalBs / tasa;

    const footerY = 550;

    doc.fontSize(8).fillColor('gray').text(`TASA BCV DEL DÍA: ${tasa.toFixed(2)} Bs/$`, 40, footerY);

    doc.fillColor('black').font('Helvetica-Bold');
    doc.text(`BASE IMPONIBLE:`, 350, footerY);
    doc.text(`Bs. ${subtotal.toFixed(2)}`, 480, footerY, { align: 'right' });

    doc.text(`IVA (${data.porcentajeIva}%):`, 350, footerY + 15);
    doc.text(`Bs. ${iva.toFixed(2)}`, 480, footerY + 15, { align: 'right' });

    doc.text(`FDO. RESERVA (5%):`, 350, footerY + 30);
    doc.text(`Bs. ${fondoReserva.toFixed(2)}`, 480, footerY + 30, { align: 'right' });

    // 3. RECUADRO DE TOTAL FINAL (Usar totalBs que ya calculamos)
    doc.rect(340, footerY + 50, 240, 45).fill('#000000'); // Un poco más alto para que quepan ambos
    doc.fillColor('white').fontSize(10);

    doc.text(`TOTAL A PAGAR:`, 350, footerY + 58);
    doc.text(`Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 480, footerY + 58, { align: 'right' });

    // 4. LÍNEA DUAL (USD) dentro del cuadro negro
    doc.fontSize(9).text(`EQUIVALENTE REFERENCIAL:`, 350, footerY + 75);
    doc.text(`$ ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 480, footerY + 75, { align: 'right' });

    // --- SELLO Y FIRMA ---
    const sealY = 660;
    doc.rect(30, sealY, 180, 80).stroke();
    doc.fillColor('black').fontSize(8).font('Helvetica-Bold').text('SELLO / FIRMA', 35, sealY + 5, { align: 'center', width: 170 });

    doc.font('Helvetica').fontSize(7);
    doc.text('Recibido por: ___________________', 40, sealY + 30);
    doc.text('Fecha: ____ / ____ / ________', 40, sealY + 55);

    doc.fontSize(9).text('COPIA CLIENTE', 30, sealY + 95, { align: 'center', width: 550 });

    doc.end();
};

module.exports = {
    generarFacturaDinamica,
    generarFacturacionMensualMasiva,
    getFacturaciones,
    getFactura,
    escribirPDF
};
