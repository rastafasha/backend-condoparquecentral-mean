const fs = require('fs');
const Profile = require('../models/profile');
const Payment = require('../models/payment');
const borrarImagen = (path) => {

    if (fs.existsSync(path)) {
        //borrar la imagen anterior
        fs.unlinkSync(path);
    }
}

const actualizarImagen = async(tipo, id, nombreArchivo) => {

    let pathViejo = '';

    switch (tipo) {

        case 'profiles':
            const profile = await Profile.findById(id);
            if (!profile) {
                console.log('No es un profile por id');
                return false;
            }
            pathViejo = `./uploads/profiles/${profile.img}`;

            borrarImagen(pathViejo);

            profile.img = nombreArchivo;
            await profile.save();
            return true;
            break;

         case 'payments':
            const payment = await Payment.findById(id);
            if (!payment) {
                console.log('No es un payment por id');
                return false;
            }
            pathViejo = `./uploads/payments/${payment.img}`;

            borrarImagen(pathViejo);

            payment.img = nombreArchivo;
            await payment.save();
            return true;
            break;



    }

};

module.exports = {
    actualizarImagen,
    borrarImagen
};