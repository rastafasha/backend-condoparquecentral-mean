/*
    Ruta: /api/profile
*/
const { Router } = require('express');
const router = Router();
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const {
    crearProfile,
    getProfiles,
    getProfile,
    actualizarProfile,
    borrarProfile,
    listarProfilePorUsuario,
    getProfilesrole,
    obtenerEstadoCuentaUsuario
} = require('../controllers/profileController');

const {
    validarJWT,
} = require('../middlewares/validar-jwt');


router.get('/all/', 
    validarJWT, 
    getProfiles);

router.get('/:id', [validarJWT], getProfile);
router.get('/user_profile/:id', listarProfilePorUsuario);
router.get('/estadocuenta/:id', obtenerEstadoCuentaUsuario);

router.post('/crear', [
    validarJWT,
    validarCampos
], crearProfile);


router.put('/editar/:id', [
    validarJWT,
    validarCampos
], actualizarProfile);

router.delete('/borrar/:id', [validarJWT, ], borrarProfile);






module.exports = router;