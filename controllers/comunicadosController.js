const { response } = require('express');
const Comunicado = require('../models/comunicado'); 
const Notificacion = require('../models/notificacion');
const Profile = require('../models/profile'); 
const Residencia = require('../models/residencia');
const Oficina = require('../models/oficina');
const Local = require('../models/local');
const PushSubscription = require('../models/push-subscription');
const Usuario = require('../models/usuario'); 
const { sendNotification } = require('../helpers/notificaciones');

// 1. CONTAR NOTIFICACIONES NO LEÍDAS (Para el Badge del Navbar)
const contarNotificacionesPendientes = async (req, res) => {
    const uid = req.uid;
    const total = await Notificacion.countDocuments({ usuario: uid, leido: false });
    res.json({ ok: true, total });
};

// 2. OBTENER COMUNICADOS SEGMENTADOS (Para la Cartelera del Vecino)
const obtenerMisComunicados = async (req, res) => {
    const uid = req.uid; 
    const pagina = Number(req.query.page) || 1;
    const desde = (pagina - 1) * 10;

    try {
        // 1. Verificar si el usuario existe
        const usuario = await Usuario.findById(uid);
        
        if (!usuario) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        // 2. Definir el filtro (Query)
        let query = {};

        // Si NO es admin ni superadmin, filtramos por su residencia
        if (usuario.role !== 'ADMIN_ROLE' && usuario.role !== 'SUPERADMIN_ROLE') {
            query = {
                $or: [
                    { alcance_residencia: 'TODOS' },
                    { alcance_residencia: usuario.residencia }
                ]
            };
        }

        // 3. Ejecutar la consulta
        // OJO: Asegúrate de que el modelo se llame 'Comunicado' y tenga estos campos
        const [comunicados, total] = await Promise.all([
            Comunicado.find(query)
                .sort({ createdAt: -1 }) // Cambia a 'fecha_creacion' si ese es tu campo
                .skip(desde)
                .limit(10)
                .populate('creado_por', 'username email'), // Verifica que el campo existe en el modelo
            Comunicado.countDocuments(query)
        ]);

        res.json({
            ok: true,
            comunicados,
            total,
            proximo: (desde + 10 < total) ? pagina + 1 : null
        });

    } catch (error) {
        console.error('ERROR EN BACKEND:', error); // Esto saldrá en tu terminal de Node
        res.status(500).json({
            ok: false,
            msg: 'Error interno en el servidor',
            error: error.message // Esto te dirá exactamente qué falló en el Postman/Network
        });
    }
};


// 3. ENVIAR COMUNICADO GLOBAL / SEGMENTADO (Solo Admin)
const enviarComunicadoGlobal = async (req, res) => {
    const { titulo, mensaje, edificio, piso, letra, tipo } = req.body;
    const adminId = req.uid;

    try {
        // 1. Construimos el filtro base (Edificio/Piso/Letra)
        let filtro = {};
        if (edificio && edificio !== 'TODOS') filtro.edificio = edificio;
        if (piso && piso !== 'TODOS') filtro.piso = piso;
        if (letra && letra !== 'TODAS') filtro.letra = letra;

        // 2. Buscamos IDs en las 3 colecciones en paralelo
        const [resIDs, ofiIDs, locIDs] = await Promise.all([
            Residencia.find(filtro).select('_id'),
            Oficina.find(filtro).select('_id'),
            Local.find(filtro).select('_id')
        ]);

        // 3. Buscamos PERFILES que tengan CUALQUIERA de esas propiedades
        // Usamos $or para capturar al dueño si coincide en alguna de sus facetas
        const perfilesAfectados = await Profile.find({
            $or: [
                { residencia: { $in: resIDs.map(r => r._id) } },
                { oficina: { $in: ofiIDs.map(o => o._id) } },
                { local: { $in: locIDs.map(l => l._id) } }
            ]
        }).select('usuario');

        // 4. Unificar IDs de Usuario (Evita duplicados si el dueño tiene apto y local en la misma zona)
        const idsUsuariosUnicos = [...new Set(perfilesAfectados.map(p => p.usuario.toString()))];

        if (idsUsuariosUnicos.length === 0) {
            return res.status(404).json({ ok: false, msg: 'No se encontraron propietarios en estos niveles/edificios.' });
        }

        // 5. Guardar Comunicado (Cartelera)
        const nuevoComunicado = new Comunicado({
            titulo, mensaje, 
            alcance_residencia: edificio, 
            creado_por: adminId, 
            tipo 
        });
        await nuevoComunicado.save();

        // 6. Notificaciones e Historial (Polling/iPhone 6s)
        const notifs = idsUsuariosUnicos.map(uid => ({
            usuario: uid,
            titulo,
            mensaje,
            tipo: 'COMUNICADO_ADMIN',
            referenciaId: nuevoComunicado._id
        }));
        await Notificacion.insertMany(notifs);

        // 7. Disparar PUSH
        const suscripciones = await PushSubscription.find({ usuario: { $in: idsUsuariosUnicos } });
        suscripciones.forEach(s => {
            sendNotification(s.subscription, titulo, mensaje, '/cartelera')
                .catch(err => { if (err.statusCode === 410) s.deleteOne(); });
        });

        res.json({ 
            ok: true, 
            msg: `Comunicado enviado a ${idsUsuariosUnicos.length} propietarios únicos.` 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al procesar el envío multizona' });
    }
};


// 4. MARCAR TODAS COMO LEÍDAS
const marcarTodasComoLeidas = async (req, res) => {
    const uid = req.uid; // ID del usuario desde el Token

    try {
        // Actualizamos todas las notificaciones pendientes de este usuario
        const resultado = await Notificacion.updateMany(
            { usuario: uid, leido: false }, 
            { leido: true }
        );

        res.json({
            ok: true,
            msg: 'Todas las notificaciones marcadas como leídas',
            modificadas: resultado.modifiedCount // Cantidad de notificaciones que se limpiaron
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al limpiar notificaciones' });
    }
};





module.exports = {
    enviarComunicadoGlobal,
    obtenerMisComunicados,
    marcarTodasComoLeidas,
    contarNotificacionesPendientes


};