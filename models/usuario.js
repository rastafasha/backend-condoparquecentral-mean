'use strict'
var mongoose = require('mongoose');
const { Schema, model } = require('mongoose');

const usuarioSchema = Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    numdoc: { type: String, required: true, unique: true  },
    role: { type: String, required: true, default: 'USER_ROLE' },
    terminos: { type: Boolean, required: false },
    google: { type: Boolean, default: false },
    profile: { type: Schema.Types.ObjectId, ref: 'profile' },
}, { collection: 'usuarios', timestamps: true  });

usuarioSchema.method('toJSON', function() { // modificar el _id a uid, esconde el password
    const { __v, _id, password, ...object } = this.toObject();
    // const { __v, _id,  ...object } = this.toObject();
    object.uid = _id;
    return object;
});

module.exports = mongoose.model('Usuario', usuarioSchema);