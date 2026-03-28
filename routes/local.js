/*
 Ruta: /api/locales
 */

const { Router } = require('express');
const router = Router();
const {
    getLocals,
    crearLocal,
    actualizarLocal,
    borrarLocal,
    getLocal,
} = require('../controllers/localController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getLocals);
router.get('/:id', getLocal);

router.post('/crear', [
    validarJWT,
    check('nombre', 'El nombre del Local es necesario').not().isEmpty(),
    validarCampos
], crearLocal);

router.put('/editar/:id', [
    validarJWT,
    check('nombre', 'El nombre del Local es necesario').not().isEmpty(),
    validarCampos
], actualizarLocal);

router.delete('/borrar/:id', validarJWT, borrarLocal);




router.get('/category_by_nombre/:nombre', find_by_name);


module.exports = router;