/*
 Ruta: /api/comunicados
 */

const { Router } = require('express');
const router = Router();
const {
    enviarComunicadoGlobal,
    obtenerMisComunicados,
    marcarTodasComoLeidas,
    contarNotificacionesPendientes
} = require('../controllers/comunicadosController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

// 1. CONTADOR PARA EL BADGE (CAMPANA)
// Se usa GET porque es una consulta. El UID viene del Token.
router.get('/contar-pendientes', validarJWT, contarNotificacionesPendientes);

// 2. MIS COMUNICADOS (CARTELERA)
// Quitamos el :id del URL porque el controlador ya usa req.uid del Token (más seguro)
router.get('/mis-comunicados', validarJWT, obtenerMisComunicados);

// 3. ENVIAR COMUNICADO (ADMIN)
router.post('/enviar-global', [
    validarJWT,
    check('titulo', 'El título del comunicado es obligatorio').not().isEmpty(),
    check('mensaje', 'El mensaje del comunicado es obligatorio').not().isEmpty(),
    check('alcance_residencia', 'Debe seleccionar un edificio o TODOS').not().isEmpty(),
    validarCampos
], enviarComunicadoGlobal);

// 4. MARCAR TODO COMO LEÍDO
router.put('/marcar-leidas-todas', validarJWT, marcarTodasComoLeidas);

// 5. BORRAR (Si decides implementarlo para limpiar la cartelera)
// router.delete('/:id', validarJWT, borrarComunicado); 

module.exports = router;
