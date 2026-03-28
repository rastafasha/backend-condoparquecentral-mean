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
    actualizarUsuarioRole
} = require('../controllers/usuarioController');
const {
    validarJWT,
} = require('../middlewares/validar-jwt');

router.get('/',  getUsuariosList);
router.get('/recientes', newest);
router.get('/all', validarJWT, getAllUsers);
router.get('/:id', 
    // [validarJWT],
     getUsuario);
router.delete('/delete/:id', [validarJWT], borrarUsuario);

router.get('/user_token/set/:email', set_token_recovery);
router.get('/user_verify/token/:email/:codigo', verify_token_recovery);
router.put('/user_password/change/:email', change_password);


router.post('/crear', [
    check('username', 'el username es obligatorio').not().isEmpty(),
    check('password', 'el password es obligatorio').not().isEmpty(),
    check('email', 'el email es obligatorio').isEmail(),
    validarCampos
], crearUsuarios);


router.put('/editar/:id', [
    validarJWT,
    check('first_name', 'el nombre es obligatorio').not().isEmpty(),
    check('email', 'el email es obligatorio').isEmail(),
    check('role', 'el role es obligatorio').not().isEmpty(),
    validarCampos
], actualizarUsuario);

router.put('/editarRole/:id', [
    validarJWT,
    check('role', 'el role es obligatorio').not().isEmpty(),
    validarCampos
], actualizarUsuarioRole);







module.exports = router;