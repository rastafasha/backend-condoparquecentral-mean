const { response } = require('express');
const Comunicado = require('../models/comunicado'); 
const Notificacion = require('../models/notificacion');
const Profile = require('../models/profile'); 
const Residencia = require('../models/residencia');
const Oficina = require('../models/oficina');
const Local = require('../models/local');
const PushSubscription = require('../models/push-subscription');
const { sendNotification } = require('../helpers/notificaciones');

// 1. CONTAR NOTIFICACIONES NO LEÍDAS (Para el Badge del Navbar)
const contarNotificacionesPendientes = async (req, res) => {
    const uid = req.uid;
    const total = await Notificacion.countDocuments({ usuario: uid, leido: false });
    res.json({ ok: true, total });
};

// 2. OBTENER COMUNICADOS SEGMENTADOS (Para la Cartelera del Vecino)
const obtenerMisComunicados = async (req, res) => {
    const uid = req.uid; // ID del usuario desde el JWT

    try {
        // 1. Buscamos el Profile del usuario con todas sus propiedades
        const perfil = await Profile.findOne({ usuario: uid })
            .populate('residencia')
            .populate('oficina')
            .populate('local');

        if (!perfil) return res.status(404).json({ ok: false, msg: 'Perfil no encontrado' });

        // 2. Extraemos todos los edificios donde el usuario tiene algo
        // Usamos un Set para no repetir edificios (ej: tiene apto y local en Tajamar)
        const misEdificios = new Set();
        
        perfil.residencia.forEach(r => misEdificios.add(r.edificio));
        perfil.oficina.forEach(o => misEdificios.add(o.edificio));
        perfil.local.forEach(l => misEdificios.add(l.edificio));

        // 3. Convertimos el Set a Array y añadimos 'TODOS' 
        // (Para que vea los comunicados generales de Parque Central)
        const edificiosFiltro = [...misEdificios, 'TODOS'];

        // 4. Buscamos los comunicados que coincidan con sus edificios
        // Los ordenamos del más reciente al más antiguo
        const comunicados = await Comunicado.find({
            alcance_residencia: { $in: edificiosFiltro }
        })
        .sort({ createdAt: -1 })
        .populate('creado_por', 'username'); // Para saber qué admin lo envió

        res.json({
            ok: true,
            comunicados
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al obtener la cartelera' });
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