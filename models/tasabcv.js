'use strict'
var mongoose = require('mongoose');
const { Schema, model } = require('mongoose');

const localSchema = Schema({
    precio_dia: { type: Number, required: true, default: 0 },
}, { collection: 'tasabcv', timestamps: true  });



module.exports = mongoose.model('Tasabcv', localSchema);