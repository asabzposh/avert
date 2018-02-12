'use strict';

const plugin = {};

plugin.package = require('../package.json');

const Hoek = require('hoek');
const Caja = require('sanitizer');
const Joi = require('joi');
const _ = require('lodash');

plugin.whiteRegex = new RegExp(/^[\s\f\n\r\t\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff\x09\x0a\x0b\x0c\x0d\x20\xa0]+$/);

// Sanitize using the Caja sanitizer
plugin.sanitize = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        obj[keys[i]] = Caja.sanitize(obj[keys[i]]);
    }

    return obj;
};

// Remove white space characters
plugin.removeWhitespace = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        if (plugin.whiteRegex.test(obj[keys[i]])) {
            delete obj[keys[i]];
        }
    }

    return obj;
};

// Remove null, empty and undefined
plugin.removeNonExistent = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        if (obj[keys[i]] === '' || obj[keys[i]] === null) {
            delete obj[keys[i]];
        }
    }

    return obj;
};

// Escape $ sign for mongodb query
plugin.escapeDollarSign = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        if (/^\$/.test(obj[keys[i]])) {
            obj[keys[i]] = _.escapeRegExp(obj[keys[i]]);
        }
    }

    return obj;
};

// Remove $ sign for mongodb query
plugin.removeDollarSign = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        if (/^\$/.test(obj[keys[i]])) {
            delete obj[keys[i]];
        }
    }

    return obj;
};

// Escape {} sign for mongodb query
plugin.escapeCurlyBracket = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        if (/^\{/.test(obj[keys[i]]) || /\}$/.test(obj[keys[i]])) {
            obj[keys[i]] = _.escapeRegExp(obj[keys[i]]);
        }
    }

    return obj;
};

// Remove curly brackets for mongodb query
plugin.removeCurlyBracket = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        if (/^\{/.test(obj[keys[i]]) || /\}$/.test(obj[keys[i]])) {
            delete obj[keys[i]];
        }
    }

    return obj;
};

// Original Object
plugin.original = (obj) => {

    return obj;
};

plugin.avert = (obj, options, firstPass, secondPass) => {

    let cleansed = obj;
    if (cleansed && Object.keys(cleansed).length) {
        if (options[firstPass]) {
            cleansed = plugin.sanitize(cleansed);
        }

        cleansed = options.genericCustomSanitizer(cleansed);
        cleansed = options[secondPass](cleansed);
        if (options.removeWhitespace) {
            cleansed = plugin.removeWhitespace(cleansed);
        }
        if (options.removeNonExistent) {
            cleansed = plugin.removeNonExistent(cleansed);
        }
        if (options.removeDollarSign) {
            cleansed = plugin.removeDollarSign(cleansed);
        }
        else if (options.escapeDollarSign) {
            cleansed = plugin.escapeDollarSign(cleansed);
        }
        if (options.removeCurlyBracket) {
            cleansed = plugin.removeCurlyBracket(cleansed);
        }
        else if (options.escapeCurlyBracket) {
            cleansed = plugin.escapeCurlyBracket(cleansed);
        }
    }

    return cleansed;
};

plugin.schema = Joi.object().keys({

    // boolean parameters
    removeWhitespace: Joi.boolean().optional(),
    removeNonExistent: Joi.boolean().optional(),
    removeDollarSign: Joi.boolean().optional(),
    escapeDollarSign: Joi.boolean().optional(),
    removeCurlyBracket: Joi.boolean().optional(),
    escapeCurlyBracket: Joi.boolean().optional(),

    avertQuery: Joi.boolean().optional(),
    avertParams: Joi.boolean().optional(),
    avertPayload: Joi.boolean().optional(),
    avertBody: Joi.boolean().optional(),

    // function parameters
    genericCustomSanitizer: Joi.func().optional(),
    queryCustomSanitizer: Joi.func().optional(),
    paramCustomSanitizer: Joi.func().optional(),
    payloadCustomSanitizer: Joi.func().optional(),
    bodyCustomSanitizer: Joi.func().optional()
});

plugin.defaults = {

    // boolean parameters
    removeWhitespace: false,
    removeNonExistent: false,
    removeDollarSign: false,
    escapeDollarSign: false,
    removeCurlyBracket: false,
    escapeCurlyBracket: false,
    avertQuery: false,
    avertParams: false,
    avertPayload: false,
    avertBody: false,

    // function parameters
    genericCustomSanitizer: plugin.original,
    queryCustomSanitizer: plugin.original,
    paramCustomSanitizer: plugin.original,
    payloadCustomSanitizer: plugin.original,
    bodyCustomSanitizer: plugin.original
};

plugin.register = async (server, options) => {

    try {
        await plugin.schema.validate(options);
    }
    catch (err) {
        return err;
    }

    const serverSettings = await Hoek.applyToDefaults(plugin.defaults, options);

    server.ext('onPostAuth', (request, h) => {

        if (request.route.settings.plugins.avert === false) {
            return h.continue;
        }

        if (request.payload || Object.keys(request.params).length || Object.keys(request.query).length) {

            request.route.settings.plugins._avert = Hoek.applyToDefaults(serverSettings, request.route.settings.plugins.avert || {});

            request.query = plugin.avert(request.query, request.route.settings.plugins._avert, 'avertQuery', 'queryCustomSanitizer');
            request.params = plugin.avert(request.params, request.route.settings.plugins._avert, 'avertParams', 'paramCustomSanitizer');
            request.payload = plugin.avert(request.payload, request.route.settings.plugins._avert, 'avertPayload', 'payloadCustomSanitizer');
        }

        return h.continue;
    });
};

module.exports = {
    register: plugin.register,
    name: 'avert',
    version: '1.0.0',
    pkg : plugin.package
};
