/*
 Ruta: /api/residencias
 */

const { Router } = require('express');
const router = Router();
const {
    getResidencias,
    crearResidencia,
    actualizarResidencia,
    borrarResidencia,
    getResidencia,
} = require('../controllers/residenciaController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getResidencias);
router.get('/:id', getResidencia);

router.post('/crear', [
    validarJWT,
    check('nombre', 'El nombre del Residencia es necesario').not().isEmpty(),
    validarCampos
], crearResidencia);

router.put('/editar/:id', [
    validarJWT,
    check('nombre', 'El nombre del Residencia es necesario').not().isEmpty(),
    validarCampos
], actualizarResidencia);

router.delete('/borrar/:id', validarJWT, borrarResidencia);


module.exports = router;