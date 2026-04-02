const Facturacion = require('../models/facturacion');
const Profile = require('../models/profile');
const Tasabcv = require('../models/tasabcv');
const Contador = require('../models/contador');
const Notificacion = require('../models/notificacion');
const PushSubscription = require('../models/push-subscription'); // Ajusta la ruta a tu modelo
const { sendNotification } = require('../helpers/notificaciones');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const webpush = require('web-push');


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
    console.log('--- INICIANDO FACTURACIÓN MASIVA ---');
    try {
        const { mes, anio, porcentajeIva, tasaBCV } = req.body;
        const precioDolar = tasaBCV || 1;

        // 1. Buscamos todos los perfiles y populamos sus datos
        const perfiles = await Profile.find()
            .populate('usuario residencia oficina local');

        let facturasCreadas = 0;
        let perfilesSaltados = 0;

        for (let perfil of perfiles) {

            // --- VALIDACIÓN 1: EXISTENCIA DE USUARIO ---
            if (!perfil.usuario) {
                console.warn(`⚠️ SALTADO: Perfil [${perfil._id}] no tiene objeto 'usuario' (está huérfano).`);
                perfilesSaltados++;
                continue;
            }

            // --- VALIDACIÓN 2: ROL CORRECTO ---
            if (perfil.usuario.role !== 'USER_ROLE') {
                console.log(`ℹ️ INFO: Perfil [${perfil.first_name}] saltado por rol [${perfil.usuario.role}].`);
                continue;
            }

            // --- VALIDACIÓN 3: FACTURA DUPLICADA ---
            const facturaExistente = await Facturacion.findOne({
                usuario: perfil.usuario._id,
                mes,
                anio
            });

            if (facturaExistente) {
                console.log(`✅ YA AL DÍA: ${perfil.first_name} ${perfil.last_name} ya tiene factura para ${mes}/${anio}.`);
                continue;
            }

            const detalles = [];

            // --- PROCESAMIENTO DE PROPIEDADES ---
            // Residencias
            perfil.residencia?.forEach(r => {
                detalles.push({
                    origen: 'RESIDENCIA',
                    propiedadId: r._id,
                    montoBase: r.montoMensual,
                    ivaPorcentaje: 0,
                    montoIva: 0,
                    descripcion: `Residencia: ${r.edificio} - ${r.letra}`
                });
            });

            // Oficinas
            perfil.oficina?.forEach(o => {
                const alicuota = o.ivaEspecial || porcentajeIva || 16;
                detalles.push({
                    origen: 'OFICINA',
                    propiedadId: o._id,
                    montoBase: o.montoMensual,
                    ivaPorcentaje: alicuota,
                    montoIva: o.montoMensual * (alicuota / 100),
                    descripcion: `Oficina: ${o.edificio} - ${o.letra}`
                });
            });

            // Locales
            perfil.local?.forEach(l => {
                const alicuota = l.ivaEspecial || porcentajeIva || 16;
                detalles.push({
                    origen: 'LOCAL',
                    propiedadId: l._id,
                    montoBase: l.montoMensual,
                    ivaPorcentaje: alicuota,
                    montoIva: l.montoMensual * (alicuota / 100),
                    descripcion: `Local: ${l.edificio} - ${l.letra}`
                });
            });

            // --- GUARDADO DE FACTURA ---
            if (detalles.length > 0) {
                const contadorDoc = await Contador.findOneAndUpdate(
                    { id: `factura_${anio}` },
                    { $inc: { secuencia: 1 } },
                    { new: true, upsert: true }
                );

                const nroFacturaFinal = `FAC-${anio}-${contadorDoc.secuencia.toString().padStart(5, '0')}`;

                const nuevaFactura = new Facturacion({
                    usuario: perfil.usuario._id,
                    nroFactura: nroFacturaFinal,
                    mes,
                    anio,
                    detalles,
                    tasaBCV: precioDolar,
                    aplicaRetencion: perfil.esAgenteRetencion || false,
                    estado: 'PENDIENTE'
                });

                await nuevaFactura.save();

                // 1. Guardamos en el HISTORIAL (App Interna)
                const miNotificacion = new Notificacion({
                    usuario: perfil.usuario._id,
                    titulo: 'Nueva Factura Disponible',
                    mensaje: `Ya puedes consultar tu factura ${nroFacturaFinal} de ${mes}/${anio}.`,
                    tipo: 'NUEVA_FACTURA',
                    referenciaId: nuevaFactura._id
                });
                await miNotificacion.save();

                // 2. Disparamos el PUSH usando el HELPER (Dentro de generarFacturacionMensualMasiva)
                PushSubscription.find({ usuario: perfil.usuario._id }).then(subs => {
                    subs.forEach(s => {
                        // Usamos 's.subscription' porque así lo definiste en tu modelo pushSchema
                        sendNotification(
                            s.subscription, 
                            miNotificacion.titulo, 
                            miNotificacion.mensaje
                        ).catch(err => {
                            // Si la suscripción falló por ser vieja (410/404), la borramos de la DB
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                s.deleteOne();
                            }
                        });
                    });
                });

                facturasCreadas++;
                console.log(`📝 GENERADA: ${nroFacturaFinal} para ${perfil.first_name} ${perfil.last_name}`);
            }

        }

        console.log(`--- FIN DEL PROCESO: ${facturasCreadas} facturas creadas ---`);

        res.json({
            ok: true,
            msg: `Proceso completado.`,
            detalles: {
                generadas: facturasCreadas,
                perfilesSinUsuario: perfilesSaltados
            }
        });

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN FACTURACIÓN MASIVA:", error);
        res.status(500).json({ ok: false, msg: 'Error interno, revisa los logs del servidor' });
    }
};



const generarFacturaDinamica = async (req, res) => {
    try {
        const { usuario, mes, anio, porcentajeIva, aplicaRetencion,
            montoRetencion, otrosCargos, tipoInmueble, tasaBCV } = req.body;


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

        // 1. Buscamos el contador y lo incrementamos en 1 (atómico)
        const contadorDoc = await Contador.findOneAndUpdate(
            { id: `factura_${anio}` }, // Crea un contador único por año: "factura_2024"
            { $inc: { secuencia: 1 } },
            { new: true, upsert: true } // Si no existe, lo crea
        );

        const numeroSecuencial = contadorDoc.secuencia.toString().padStart(5, '0'); // Ej: 00001
        const nroFacturaFinal = `FAC-${anio}-${numeroSecuencial}`;

        // 1. PRIMERO buscas la tasa
        const tasaData = await Tasabcv.findOne().sort({ createdAt: -1 });
        const precioDolar = tasaData ? tasaData.precio_dia : 1;

        const factura = new Facturacion({
            usuario,
            nroFactura: nroFacturaFinal,
            tasaBCV: precioDolar,
            mes, anio, detalles, porcentajeIva,
            aplicaRetencion: Boolean(aplicaRetencion),
            montoRetencion: aplicaRetencion ? (Number(montoRetencion) || 0) : 0,
            otrosCargos: Number(otrosCargos) || 0
        });



        const facturaGuardada = await factura.save();

        // ==========================================================
        // 1. GUARDAR EN HISTORIAL (App Interna)
        // ==========================================================
        const miNotificacion = new Notificacion({
            usuario: usuario, // El ID que viene en el req.body
            titulo: 'Nueva Factura Generada',
            mensaje: `Se ha generado tu factura ${nroFacturaFinal} de ${mes}/${anio}.`,
            tipo: 'NUEVA_FACTURA',
            referenciaId: facturaGuardada._id
        });
        await miNotificacion.save();
        // ==========================================================
        // 2. DISPARAR PUSH (Sin 'await' para no retrasar el PDF)
        // ==========================================================
        PushSubscription.find({ usuario: usuario }).then(subs => {
            subs.forEach(s => {
                // IMPORTANTE: s.subscription como definimos en tu modelo
                sendNotification(
                    s.subscription,
                    miNotificacion.titulo,
                    miNotificacion.mensaje
                ).catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) s.deleteOne();
                });
            });
        });
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
            inmueble: identificadorInmueble,
            tasaBCV: tasaBCV, // Usa la del body para que sea 36.5
            porcentajeIva: 16, // O el valor que corresponda para evitar el 'undefined'
            prefijo: prefijo,
            // Agrega el equivalente en dólares para evitar el '$ NaN'
            equivalenteDolar: (facturaGuardada.totalPagar / tasaBCV).toFixed(2)
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

    // --- ENCABEZADO ---
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
    doc.text(`FACTURA NRO: ${data.nroFactura}`, 400, 50);

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
        // Solo dibujamos la línea si el monto es mayor a cero
        if (Number(item.montoBase) > 0) {
            doc.text(item.descripcion.substring(0, 45), 40, y);
            doc.text(`---`, 250, y, { width: 100, align: 'center' });
            doc.text(`---`, 350, y, { width: 100, align: 'center' });
            doc.font('Helvetica-Bold').text(`Bs. ${(Number(item.montoBase) || 0).toFixed(2)}`, 480, y, { width: 100, align: 'right' });

            y += 15;
            doc.moveTo(30, y).lineTo(580, y).dash(1, { space: 2 }).stroke().undash();
            y += 5;
        }
    });

    // --- CÁLCULOS SIN FONDO DE RESERVA ---
    const subtotal = (data.detalles || []).reduce((acc, i) => acc + (Number(i.montoBase) || 0), 0);
    const porcentajeIva = data.porcentajeIva || (data.detalles && data.detalles[0] ? data.detalles[0].ivaPorcentaje : 16);
    const iva = (subtotal * (porcentajeIva / 100));
    // Tomamos la retención y los otros cargos directamente del objeto data
    const montoRetencion = Number(data.montoRetencion) || 0;
    const otrosCargos = Number(data.otrosCargos) || 0;

    // TOTAL FINAL: Base + IVA + Otros - Retención
    const totalBs = subtotal + iva + otrosCargos - montoRetencion;

    const tasa = Number(data.tasaBCV) || 1;
    const totalUSD = totalBs / tasa;

    const footerY = 550;

    // --- BLOQUE DE TOTALES ---
    doc.fontSize(8).fillColor('gray').text(`TASA BCV DEL DÍA: ${tasa.toFixed(2)} Bs/$`, 40, footerY);

    doc.fillColor('black').font('Helvetica-Bold');
    doc.text(`BASE IMPONIBLE:`, 350, footerY);
    doc.text(`Bs. ${subtotal.toFixed(2)}`, 480, footerY, { align: 'right' });

    doc.text(`IVA (${porcentajeIva}%):`, 350, footerY + 15);
    doc.text(`Bs. ${iva.toFixed(2)}`, 480, footerY + 15, { align: 'right' });

    // MOSTRAR RETENCIÓN SOLO SI APLICA
    if (data.aplicaRetencion && montoRetencion > 0) {
        doc.fillColor('red'); // Opcional: poner en rojo para resaltar la resta
        doc.text(`RETENCIÓN IVA (-):`, 350, footerY + 30);
        doc.text(`Bs. ${montoRetencion.toFixed(2)}`, 480, footerY + 30, { align: 'right' });
        doc.fillColor('black');
    }

    // Eliminamos las líneas del Fondo de Reserva aquí

    // RECUADRO DE TOTAL FINAL
    doc.rect(340, footerY + 50, 240, 45).fill('#000000');
    doc.fillColor('white').fontSize(10);

    doc.text(`TOTAL A PAGAR:`, 350, footerY + 48);
    doc.text(`Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 480, footerY + 48, { align: 'right' });

    doc.fontSize(9).text(`EQUIVALENTE REFERENCIAL:`, 350, footerY + 65);
    doc.text(`$ ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 480, footerY + 65, { align: 'right' });

    // --- SELLO Y FIRMA ---
    const sealY = 660;
    doc.rect(30, sealY, 180, 80).stroke();
    doc.fillColor('black').fontSize(8).font('Helvetica-Bold').text('SELLO / FIRMA', 35, sealY + 5, { align: 'center', width: 170 });
    doc.font('Helvetica').fontSize(7).text('Recibido por: ___________________', 40, sealY + 30);
    doc.text('Fecha: ____ / ____ / ________', 40, sealY + 55);
    doc.fontSize(9).text('COPIA CLIENTE', 30, sealY + 95, { align: 'center', width: 550 });

    doc.end();
};


const listarPaymentPorStatus = async (req, res) => {
    var estado = req.params['estado'];
    try {
        // First, find the category by name
        const factura = await Facturacion.findOne({ estado: estado });

        if (!factura) {
            return res.status(404).json({ message: 'Pago no encontrado' });
        }

        // Then, find projects using the category's ObjectId
        const facturas = await Facturacion.find({ estado: estado });

        res.status(200).send({ facturas: facturas });
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

const listarStatusFacturas = async (req, res) => {
    try {
        // Ejecutamos los conteos en paralelo para máxima velocidad
        const [pagadas, pendientes, anuladas] = await Promise.all([
            Facturacion.countDocuments({ estado: 'PAGADO' }),
            Facturacion.countDocuments({ estado: 'PENDIENTE' }),
            Facturacion.countDocuments({ estado: 'ANULADO' })
        ]);

        // Retornamos un objeto estructurado para el gráfico
        res.status(200).json({
            labels: ['Pagado', 'Pendiente', 'Anulado'],
            data: [pagadas, pendientes, anuladas]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getFacturasByUser = async (req, res) => {
    const userId = req.params.id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const query = { usuario: userId };

        // Buscamos y contamos
        const [facturas, total] = await Promise.all([
            Facturacion.find(query)
                .sort({ createdAt: -1 }) // Mostrar las más recientes primero
                .skip(skip)
                .limit(limit)
                .lean({ virtuals: true }), // VITAL: lean para performance, virtuals para el totalPagar
            Facturacion.countDocuments(query)
        ]);

        // Mongoose lean() por defecto no trae virtuals, 
        // si no los ves, los calculamos manualmente antes de enviar:
        const facturasConTotal = facturas.map(f => {
            const subtotal = f.detalles.reduce((acc, item) => acc + item.montoBase, 0);
            const totalIva = f.detalles.reduce((acc, item) => acc + (item.montoIva || 0), 0);
            const totalPagar = (subtotal + totalIva + (f.otrosCargos || 0)) - (f.montoRetencion || 0);
            return { ...f, totalPagar };
        });

        res.json({
            ok: true,
            facturas: facturasConTotal,
            total,
            pages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('Error en getFacturasByUser:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener las facturas' });
    }
};


module.exports = {
    generarFacturaDinamica,
    generarFacturacionMensualMasiva,
    getFacturaciones,
    getFactura,
    escribirPDF,
    listarPaymentPorStatus,
    listarStatusFacturas,
    getFacturasByUser
};
