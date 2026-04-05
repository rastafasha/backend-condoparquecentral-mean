const Facturacion = require('../models/facturacion');
const Profile = require('../models/profile');
const Tasabcv = require('../models/tasabcv');
const Contador = require('../models/contador');
const Residencia = require('../models/residencia');
const Local = require('../models/local');
const Oficina = require('../models/oficina');
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
        const { mes, anio, ivaPorcentaje, tasaBCV } = req.body;
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
                const alicuota = o.ivaEspecial || ivaPorcentaje || 16;
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
                const alicuota = l.ivaEspecial || ivaPorcentaje || 16;
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
                // --- ENVÍO DE NOTIFICACIÓN PUSH (Colección Independiente) ---
                PushSubscription.find({ usuario: perfil.usuario._id }).then(subs => {
                    subs.forEach(s => {
                        // Pasamos 4 argumentos: suscripción, título, mensaje y RUTA
                        sendNotification(
                            s.subscription,
                            miNotificacion.titulo,
                            miNotificacion.mensaje,
                            '/mis-facturas' // <--- CUARTO PARÁMETRO: La ruta en Angular
                        ).catch(err => {
                            if (err.statusCode === 410 || err.statusCode === 404) s.deleteOne();
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
        const { usuario, mes, anio, ivaPorcentaje, aplicaRetencion,
            montoRetencion, otrosCargos, tipoInmueble, tasaBCV } = req.body;


        const perfil = await Profile.findOne({ usuario }).populate('residencia oficina local');
        if (!perfil) return res.status(404).json({ ok: false, msg: 'Perfil no existe' });


        let detalles = [];
        // SI EL FRONTEND ENVÍA DETALLES, ÚSALOS DIRECTAMENTE
        if (req.body.detalles && req.body.detalles.length > 0) {
            // Reasignamos el array con la data del body
            detalles = req.body.detalles.map(d => {
                const base = Number(d.montoBase) || 0;
                const porcentaje = Number(ivaPorcentaje || 16); // Usas el porcentaje que viene en el body
                return {
                    origen: d.origen || 'RESIDENCIA',
                    propiedadId: d.propiedadId,
                    montoBase: base,
                    ivaPorcentaje: porcentaje,
                    montoIva: base * (porcentaje / 100),
                    descripcion: d.descripcion || 'Mantenimiento Mensual'
                };
            });
        } else {
            // 2. Lógica de respaldo si el body viene vacío (usando el perfil)
            const procesarPropiedades = (propiedades, tipoEtiqueta, origenReal) => {
                if (!propiedades || !Array.isArray(propiedades)) return;
                propiedades.forEach(p => {
                    const base = Number(p.montoMensual) || 0;
                    const porcentaje = Number(ivaPorcentaje || 16);
                    detalles.push({
                        origen: origenReal,
                        propiedadId: p._id,
                        montoBase: base,
                        ivaPorcentaje: porcentaje,
                        montoIva: base * (porcentaje / 100),
                        descripcion: `${tipoEtiqueta}: ${p.edificio || ''} - ${p.letra || ''}`
                    });
                });
            };

            if (perfil.residencia?.length > 0) procesarPropiedades(perfil.residencia, 'Residencia', 'RESIDENCIA');
            if (perfil.oficina?.length > 0) procesarPropiedades(perfil.oficina, 'Oficina', 'OFICINA');
            if (perfil.local?.length > 0) procesarPropiedades(perfil.local, 'Local', 'LOCAL');
        }
        // VALIDACIÓN: Si después de todo detalles sigue vacío o en 0
        if (detalles.length === 0 || detalles[0].montoBase === 0) {
            console.error("ERROR: Monto base llegó en 0", detalles);
        }

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

        // Antes de crear la factura, aseguremos el valor
        const finalIva = (ivaPorcentaje !== undefined) ? ivaPorcentaje : (req.body.ivaPorcentaje || 16);

        const factura = new Facturacion({
            usuario,
            nroFactura: nroFacturaFinal,
            tasaBCV: precioDolar,
            mes,
            anio,
            detalles, // <--- Ahora estos detalles ya llevan su IVA incluido
            // ivaPorcentaje: Number(finalIva),  <-- ELIMINA ESTA LÍNEA, no existe en tu Schema
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
        // --- ENVÍO DE NOTIFICACIÓN PUSH (Colección Independiente) ---
        PushSubscription.find({ usuario: usuario }).then(subs => {
            subs.forEach(s => {
                sendNotification(
                    s.subscription,
                    miNotificacion.titulo,
                    miNotificacion.mensaje,
                    '/mis-facturas' // <--- CUARTO PARÁMETRO: Envía al usuario a sus facturas
                ).catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) s.deleteOne();
                });
            });
        });
        // 1. Unimos el nombre del perfil
        const nombreCompleto = `${perfil.first_name} ${perfil.last_name}`;
        // 2. Extraemos el origen real para buscar la unidad
        const origenReal = (detalles && detalles.length > 0) ? detalles[0].origen : 'RESIDENCIA';
        const keyPerfil = origenReal.toLowerCase();

        const unidadesDeEsteTipo = perfil[keyPerfil];
        // Si es un array, tomamos el primero; si no, la unidad misma
        const unidad = (Array.isArray(unidadesDeEsteTipo) && unidadesDeEsteTipo.length > 0)
            ? unidadesDeEsteTipo[0]
            : (unidadesDeEsteTipo || null);

        const identificadorInmueble = unidad
            ? `${origenReal}: ${unidad.edificio || ''} - ${unidad.letra || ''}`
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
            tasaBCV: facturaGuardada.tasaBCV,
            // CAMBIO AQUÍ: Accedemos al primer elemento del array detalles
            ivaPorcentaje: (facturaGuardada.detalles && facturaGuardada.detalles.length > 0)
                ? facturaGuardada.detalles[0].ivaPorcentaje
                : 16,
            prefijo: prefijo,
            equivalenteDolar: (facturaGuardada.totalPagar / facturaGuardada.tasaBCV).toFixed(2)
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

    // Ayuda para formatear moneda venezolana (Ej: 1.250,50)
    const bs = (monto) => {
        return Number(monto).toLocaleString('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const usd = (monto) => {
        return Number(monto).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };
    // Aumentamos un poco el margen inferior para evitar saltos automáticos
    const doc = new PDFDocument({ margin: 30, size: 'LETTER' });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // Izquierda: Datos Fiscales
    doc.fontSize(7).font('Helvetica-Bold').text('CORPOCAPITAL', 30, 40);
    doc.fontSize(6).font('Helvetica').text('RIF: G-20010665-4', 30, 50);
    doc.text('Corporación para la Construcción y Gestión de Urbanismo...', 30, 60, { width: 250 });
    doc.text('Teléfonos: (0212) 508.57.00 / 508.66.66', 30, 80);


    // Derecha: El Nro de Control resaltado
    doc.fontSize(10).fillColor('red').text('N° DE CONTROL 00- 044176', 400, 40, { align: 'right' });
    doc.fontSize(12).text(`FACTURA SERIE "E"  N° ${data.nroFactura.split('-').pop()}`, 400, 65, { align: 'right' });
    doc.fillColor('black');

    // --- DATOS DEL CLIENTE (Bajado para que no choque con el encabezado) ---
    const clienteY = 105;
    doc.rect(30, clienteY, 550, 45).stroke();
    doc.fontSize(9).fillColor('black'); // Asegura color negro
    doc.text(`NOMBRE: ${data.usuarioNombre}`, 40, clienteY + 10);
    doc.text(`INMUEBLE: ${data.inmueble}`, 40, clienteY + 25);
    doc.text(`FECHA EMISIÓN: ${new Date().toLocaleDateString()}`, 420, clienteY + 10);


    // --- TABLA DE GASTOS ---
    const tableTop = 170; // Subimos un poco la tabla
    // Líneas horizontales dobles como en el papel original
    doc.moveTo(30, tableTop).lineTo(580, tableTop).stroke();
    doc.moveTo(30, tableTop + 20).lineTo(580, tableTop + 20).stroke();

    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('RELACIÓN DE CONSUMO GENERAL', 40, tableTop + 7);
    doc.text('INF. GRAL', 220, tableTop + 7, { width: 80, align: 'center' });
    doc.text('GASTO EDIFICIO', 310, tableTop + 7, { width: 80, align: 'center' });
    doc.text('ALÍCUOTA DE APTO', 450, tableTop + 7, { width: 130, align: 'right' });

    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(8);

    const mesesArray = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const nombreMes = mesesArray[data.mes - 1] || ''; // data.mes viene del backend

    (data.detalles || []).forEach(item => {
        if (Number(item.montoBase) > 0) {
            // Unimos la descripción original con el mes y el año
            const descripcionConPeriodo = `${item.descripcion} - ${nombreMes} ${data.anio}`;

            // Dibujamos una sola vez por fila
            doc.font('Helvetica').fontSize(8);
            doc.text(descripcionConPeriodo.substring(0, 60), 40, y);

            doc.text(`---`, 220, y, { width: 80, align: 'center' }); // Columna INF. GRAL
            doc.text(`---`, 310, y, { width: 80, align: 'center' }); // Columna GASTO EDIF

            doc.font('Helvetica-Bold').text(`Bs. ${(Number(item.montoBase) || 0).toFixed(2)}`, 450, y, { width: 130, align: 'right' });

            y += 15;
            doc.moveTo(30, y).lineTo(580, y).dash(1, { space: 2 }).stroke().undash();
            y += 5;
        }
    });

    // --- CÁLCULOS (Ajustados a tu nuevo modelo) ---
    const subtotal = (data.detalles || []).reduce((acc, i) => acc + (Number(i.montoBase) || 0), 0);
    // Buscamos el porcentaje del primer item del arreglo (si no hay, ponemos 16 por defecto)
    const ivaPorcentaje = (data.detalles && data.detalles.length > 0) ? data.detalles[0].ivaPorcentaje : 16;
    // Sumamos el IVA de cada detalle que ya tienes guardado en la base de datos
    const iva = (data.detalles || []).reduce((acc, i) => acc + (Number(i.montoIva) || 0), 0);

    const montoRetencion = Number(data.montoRetencion) || 0;
    const otrosCargos = Number(data.otrosCargos) || 0;

    // El total ahora usa la suma de IVA real que calculamos arriba
    const totalBs = subtotal + iva + otrosCargos - montoRetencion;

    const tasa = Number(data.tasaBCV) || 1;
    const totalUSD = totalBs / tasa;

    // --- BLOQUE DE TOTALES (Subido para asegurar una página) ---
    // Si 'y' (donde terminó la tabla) es mayor a 510, le damos un margen de 20px. 
    // Si no, lo dejamos en 510 para que mantenga una posición estética mínima.
    const footerY = Math.max(y + 30, 400); 

    doc.fontSize(8).fillColor('gray').text(`TASA BCV DEL DÍA: ${tasa.toFixed(2)} Bs/$`, 40, footerY);

    doc.fillColor('black').font('Helvetica-Bold');
    doc.text(`BASE IMPONIBLE:`, 350, footerY);
    doc.text(`Bs. ${bs(subtotal)}`, 450, footerY, { width: 130, align: 'right' });

    doc.text(`IVA (${data.ivaPorcentaje}%):`, 350, footerY + 15);
    doc.text(`Bs. ${bs(iva)}`, 450, footerY + 15, { width: 130, align: 'right' });
    // --- OTROS CARGOS (Añade esta condición aquí) ---
    if (otrosCargos > 0) {
        doc.text(`OTROS CARGOS (+):`, 350, footerY + 30);
        doc.text(`Bs. ${bs(otrosCargos)}`, 450, footerY + 30, { width: 130, align: 'right' });
    }
    // --- RETENCIÓN (Si llegaras a enviarla en el futuro) ---
    if (data.aplicaRetencion && montoRetencion > 0) {
        doc.fillColor('red').text(`RETENCIÓN IVA (-):`, 350, footerY + 45);
        doc.text(`Bs. ${bs(montoRetencion)}`, 450, footerY + 45, { width: 130, align: 'right' });
        doc.fillColor('black');
    }

    // RECUADRO DE TOTAL FINAL (Estilo Factura Real)
    const totalBoxY = footerY + 80; 
    doc.rect(30, totalBoxY, 550, 55).fill('#FF8C00');
    doc.fillColor('white').font('Helvetica-Bold');

    // Título a la izquierda
    doc.fontSize(11).text(`TOTAL A PAGAR (BS.):`, 45, totalBoxY + 22);

    // Monto en Bolívares (Formateado con coma decimal y puntos de mil)
    doc.text(`Bs. ${bs(Number(totalBs))}`, 450, totalBoxY + 15, { width: 120, align: 'right' });

    /// Equivalente en Dólares (Debajo del monto en Bs)
    doc.fontSize(8).font('Helvetica').text(`EQUIVALENTE: $ ${usd(totalUSD)}`, 450, totalBoxY + 35, { width: 120, align: 'right' });

    // --- SELLO Y FIRMA (Subido de 660 a 630 para seguridad) ---
    doc.fillColor('black');

    const sealY = totalBoxY + 80; 
    doc.rect(30, sealY, 180, 80).stroke();
    doc.fillColor('black').fontSize(8).font('Helvetica-Bold').text('SELLO / FIRMA', 35, sealY + 5, { align: 'center', width: 170 });
    doc.font('Helvetica').fontSize(7).text('Recibido por: ___________________', 40, sealY + 30);
    doc.text('Fecha: ____ / ____ / ________', 40, sealY + 55);

    // IMPORTANTE: Hemos quitado totalmente el texto "COPIA CLIENTE"
    // y cualquier comando que use coordenadas mayores a 750 para evitar la 2da página.

    // --- PIE DE PÁGINA (LETRAS CHIQUITAS LEGALES) ---
    doc.fillColor('black'); // Resetear color después del cuadro naranja
    const finalY = 720; // Espacio seguro antes del borde

    doc.fontSize(6).font('Helvetica');
    doc.text('ESTA FACTURA NO PRUEBA EL PAGO DE LAS ANTERIORES - TELÉFONOS: (0212) 508.57.00 / 508.66.66', 30, finalY, { align: 'center', width: 550 });

    doc.fontSize(5).font('Helvetica-Bold');
    doc.text('DOMICILIO FISCAL: Av. Lecuna, entre Av. Sur 17 y Bolívar, Edif. Torre Oeste, Piso 30 Of. 16, Urb. San Pedro, Caracas.', 30, finalY + 10, { align: 'center', width: 550 });

    doc.font('Helvetica').text('REGISTRO SENIAT: 01/00801 de fecha 06/05/2008 - Autorizado por el SENIAT bajo el nro. de providencia 044176.', 30, finalY + 20, { align: 'center', width: 550 });

    // --- MARCA DE AGUA OPCIONAL (Para que se vea "pro") ---
    // doc.opacity(0.05);
    // doc.image('ruta/a/tu/logo.png', 150, 300, { width: 300 }); // Centrado y transparente
    // doc.opacity(1);

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

            // Calculamos el total
            const totalCrudo = (subtotal + totalIva + (f.otrosCargos || 0)) - (f.montoRetencion || 0);

            // IMPORTANTE: Redondear a 2 decimales para evitar el "hipo" de JavaScript
            const totalPagar = Math.round(totalCrudo * 100) / 100;

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
