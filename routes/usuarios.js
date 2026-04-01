/*
    Ruta: /api/usuarios
*/
const { Router } = require('express');
const router = Router();
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const {
    getUsuariosList,
    crearUsuarios,
    actualizarUsuario,
    borrarUsuario,
    getUsuario,
    getAllUsers,
    newest,
    set_token_recovery,
    verify_token_recovery,
    change_password,
    actualizarUsuarioRole,
    cargarUsuariosMasivo
} = require('../controllers/usuarioController');
const {
    validarJWT,
} = require('../middlewares/validar-jwt');

router.get('/',  getUsuariosList);
router.get('/recientes', newest);
router.get('/all', 
    // validarJWT, 
    getAllUsers);
router.get('/:id', 
    // validarJWT, 
    getUsuario);
router.delete('/delete/:id', [
    validarJWT,
    check('id').isMongoId().withMessage('ID inválido'),
    validarCampos
], borrarUsuario);

router.get('/user_token/set/:email', set_token_recovery);
router.get('/user_verify/token/:email/:codigo', verify_token_recovery);
router.put('/user_password/change/:email', change_password);


router.post('/crear', [
    check('username', 'el username es obligatorio').not().isEmpty(),
    check('password', 'el password es obligatorio').not().isEmpty(),
    check('email', 'el email es obligatorio').isEmail(),
    validarCampos
], crearUsuarios);

router.post('/cargarusuariosmasivos', [
    check('username', 'el username es obligatorio').not().isEmpty(),
    check('password', 'el password es obligatorio').not().isEmpty(),
    check('email', 'el email es obligatorio').isEmail(),
    validarCampos
], cargarUsuariosMasivo);


router.put('/editar/:id', [
    validarJWT,
    check('id').isMongoId().withMessage('ID de usuario inválido'),
    check('first_name', 'el nombre es obligatorio').not().isEmpty(),
    check('email', 'el email es obligatorio').isEmail(),
    check('role', 'el role es obligatorio').not().isEmpty(),
    validarCampos
], actualizarUsuario);

router.put('/editarRole/:id', [
    validarJWT,
    check('id').isMongoId().withMessage('ID de usuario inválido'),
    check('role', 'el role es obligatorio').not().isEmpty(),
    validarCampos
], actualizarUsuarioRole);

//notificaciones
router.get('/enviar-prueba', validarJWT, async (req, res) => {
    try {
        const { sendNotification } = require('../helpers/notificaciones');
        const usuario = await Usuario.findById(req.uid);

        if (usuario.pushSubscription) {
            await sendNotification(
                usuario.pushSubscription, 
                '¡Conexión Exitosa!', 
                'Esta notificación viene directamente de tu base de datos en Render.'
            );
            return res.json({ ok: true, msg: 'Notificación enviada' });
        }
        
        res.status(404).json({ ok: false, msg: 'No tienes suscripción activa' });
    } catch (error) {
        res.status(500).json({ ok: false, error });
    }
});







module.exports = router;