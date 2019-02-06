'use strict';

const Lab = require('lab');

const lab = (exports.lab = Lab.script());
const Code = require('code');
const Hapi = require('hapi');

const Avert = require('../');

const describe = lab.describe;
const expect = Code.expect;
const beforeEach = lab.beforeEach;
const afterEach = lab.afterEach;
const it = lab.it;

describe('registration and functionality', () => {
    let server;

    const routes = [
        {
            method: 'GET',
            path: '/queryTest',
            handler: (request, h) => {
                return request.query;
            }
        },
        {
            method: 'GET',
            path: '/paramsTest/{a}/{b?}',
            handler: (request, h) => {
                return request.params;
            }
        },
        {
            method: 'POST',
            path: '/payloadTest',
            handler: (request, h) => {
                return request.payload;
            }
        }
    ];

    beforeEach(() => {
        server = Hapi.server();

        return;
    });

    afterEach(async () => {
        await server.stop();
        // server = null;
        return;
    });

    const genericCustomSanitizer = (obj) => {
        const keys = Object.keys(obj);

        for (let i = 0; i < keys.length; ++i) {
            obj[keys[i]] = obj[keys[i]] + 'cg';
        }

        return obj;
    };

    const queryCustomSanitizer = (obj) => {
        const keys = Object.keys(obj);

        for (let i = 0; i < keys.length; ++i) {
            obj[keys[i]] = obj[keys[i]] + 'cq';
        }

        return obj;
    };

    const paramCustomSanitizer = (obj) => {
        const keys = Object.keys(obj);

        for (let i = 0; i < keys.length; ++i) {
            obj[keys[i]] = obj[keys[i]] + 'cp';
        }

        return obj;
    };

    const payloadCustomSanitizer = (obj) => {
        const keys = Object.keys(obj);

        for (let i = 0; i < keys.length; ++i) {
            obj[keys[i]] = obj[keys[i]] + 'cpay';
        }

        return obj;
    };

    // Test # 1
    it('registers without options', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route({
                method: 'GET',
                path: '/',
                handler: (request, h) => {
                    return '';
                }
            });

            const request = { method: 'GET', url: '/' };
            const res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('');
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 2
    it('registers with error if invalid options', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { something: 'value' }
            });
        } catch (err) {
            expect(err).to.exist();
        }
    });

    // Test # 3
    it('can be disabled per route', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { removeNonExistent: true }
            });

            server.route({
                method: 'GET',
                path: '/disabled',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: false
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/disabled',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: false
                    }
                }
            });

            // Part 1
            let request = { method: 'GET', url: '/disabled?a=&b=&c=c' };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '', b: '', c: 'c' });

            // Part 2
            request = {
                method: 'POST',
                url: '/disabled',
                payload: { a: '', b: '', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '', b: '', c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 4
    it('removes empties', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { removeNonExistent: true }
            });

            server.route(routes);

            let request = { method: 'GET', url: '/queryTest?a=&b=&c=c' };
            let res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ c: 'c' });

            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: '', b: null, c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 5
    it('removes empties on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            removeNonExistent: true
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            removeNonExistent: true
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a=&b=&c=c'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });

            // Part 2
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: '', b: '', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 6
    it('removes whitespaces', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { removeWhitespace: true }
            });

            server.route(routes);

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTest?a=%20%20%20&b=%20%20%20&c=c'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTest/' + encodeURIComponent('      ') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: '      ', b: '       ', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 7
    it('removes whitespaces on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            removeWhitespace: true
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            removeWhitespace: true
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            removeWhitespace: true
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a=%20%20%20&b=%20%20%20&c=c'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });

            // Part 2
            request = {
                method: 'GET',
                url:
                    '/paramsTestPerRoute/' + encodeURIComponent('      ') + '/c'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: 'c' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: '      ', b: '       ', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 8
    it('removes dollar sign', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { removeDollarSign: true }
            });

            server.route(routes);

            // Part 1
            let request = { method: 'GET', url: '/queryTest?a=$aad&b=$&c=BTC' };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTest/' + encodeURIComponent('$') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: '$BTC', b: '$', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 9
    it('removes dollar sign on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            removeDollarSign: true
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            removeDollarSign: true
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            removeDollarSign: true
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a=$aad&b=$&c=BTC'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTestPerRoute/' + encodeURIComponent('$') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: '$BTC', b: '$', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 10
    it('escapes dollar sign', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { escapeDollarSign: true }
            });

            server.route(routes);

            // Part 1
            let request = { method: 'GET', url: '/queryTest?a=$aad&b=$&c=BTC' };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '\\$aad', b: '\\$', c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTest/' + encodeURIComponent('$') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '\\$', b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: '$BTC', b: '$', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '\\$BTC', b: '\\$', c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 11
    it('escapes dollar sign on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            escapeDollarSign: true
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            escapeDollarSign: true
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            escapeDollarSign: true
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a=$aad&b=$&c=BTC'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '\\$aad', b: '\\$', c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTestPerRoute/' + encodeURIComponent('$') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '\\$', b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: '$BTC', b: '$', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '\\$BTC', b: '\\$', c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 12
    it('chooses to remove dollar sign with both remove & escape options are given', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { removeDollarSign: true, escapeDollarSign: true }
            });

            server.route(routes);

            // Part 1
            let request = { method: 'GET', url: '/queryTest?a=$aad&b=$&c=BTC' };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTest/' + encodeURIComponent('$') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: '$BTC', b: '$', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 13
    it('chooses to remove dollar sign when both remove & escape options are given on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            removeDollarSign: true,
                            escapeDollarSign: true
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            removeDollarSign: true,
                            escapeDollarSign: true
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            removeDollarSign: true,
                            escapeDollarSign: true
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a=$aad&b=$&c=BTC'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTestPerRoute/' + encodeURIComponent('$') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: '$BTC', b: '$', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 14
    it('removes curly brackets', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { removeCurlyBracket: true }
            });

            server.route(routes);

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTest?a={aa}d}&b={}&c=BTC'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTest/' + encodeURIComponent('{}') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: '{BTC', b: '{}}', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 15
    it('removes curly bracket on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            removeCurlyBracket: true
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            removeCurlyBracket: true
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            removeCurlyBracket: true
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a={aa}d}&b={}&c=BTC'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTestPerRoute/' + encodeURIComponent('{}') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: '{BTC', b: '{}}', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 16
    it('escapes curly bracket', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { escapeCurlyBracket: true }
            });

            server.route(routes);

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTest?a={aa}d}&b={}&c=BTC'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({
                a: '\\{aa\\}d\\}',
                b: '\\{\\}',
                c: 'BTC'
            });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTest/' + encodeURIComponent('{}') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '\\{\\}', b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: '{BTC', b: '{}}', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({
                a: '\\{BTC',
                b: '\\{\\}\\}',
                c: 'c'
            });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 17
    it('escapes curly bracket on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            escapeCurlyBracket: true
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            escapeCurlyBracket: true
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            escapeCurlyBracket: true
                        }
                    }
                }
            });
            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a={aa}d}&b={}&c=BTC'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({
                a: '\\{aa\\}d\\}',
                b: '\\{\\}',
                c: 'BTC'
            });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTestPerRoute/' + encodeURIComponent('{}') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ a: '\\{\\}', b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: '{BTC', b: '{}}', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({
                a: '\\{BTC',
                b: '\\{\\}\\}',
                c: 'c'
            });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 18
    it('chooses to remove curly bracket when both remove & escape options are given', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: { removeCurlyBracket: true, escapeCurlyBracket: true }
            });

            server.route(routes);

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTest?a={aa}d}&b={}&c=BTC'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTest/' + encodeURIComponent('{}') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: '{BTC', b: '{}}', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 19
    it('chooses to remove dollar sign when both remove & escape options are given on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            removeCurlyBracket: true,
                            escapeCurlyBracket: true
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            removeCurlyBracket: true,
                            escapeCurlyBracket: true
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            removeCurlyBracket: true,
                            escapeCurlyBracket: true
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a={aa}d}&b={}&c=BTC'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'BTC' });

            // Part 2
            request = {
                method: 'GET',
                url: '/paramsTestPerRoute/' + encodeURIComponent('{}') + '/5'
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ b: '5' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: '{BTC', b: '{}}', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal({ c: 'c' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 20
    it('sanitizes on global coverage', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: {
                    avertQuery: true,
                    avertParams: true,
                    avertPayload: true
                }
            });

            server.route(routes);

            // Part 1
            let request = {
                method: 'GET',
                url:
                    '/queryTest?a=' +
                    encodeURIComponent(
                        '<b>hello <i>world</i><script src=foo.js></script></b>'
                    )
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

            // Part 2
            request = {
                method: 'GET',
                url:
                    '/paramsTest/' +
                    encodeURIComponent(
                        '<b>hello <i>world</i><script src=foo.js></script></b>'
                    )
            };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: {
                    a: '<b>hello <i>world</i><script src=foo.js></script></b>'
                }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 21
    it('sanitizes on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            avertQuery: true
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            avertParams: true
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            avertPayload: true
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url:
                    '/queryTestPerRoute?a=' +
                    encodeURIComponent(
                        '<b>hello <i>world</i><script src=foo.js></script></b>'
                    )
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

            // Part 2
            request = {
                method: 'GET',
                url:
                    '/paramsTestPerRoute/' +
                    encodeURIComponent(
                        '<b>hello <i>world</i><script src=foo.js></script></b>'
                    )
            };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: {
                    a: '<b>hello <i>world</i><script src=foo.js></script></b>'
                }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 22
    it('accepts custom generic sanitizer', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: {
                    genericCustomSanitizer
                }
            });

            server.route(routes);

            // Part 1
            let request = { method: 'GET', url: '/queryTest?a=a&b=b&c=c' };
            let res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acg', b: 'bcg', c: 'ccg' });

            // Part 2
            request = { method: 'GET', url: '/paramsTest/a/b' };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acg', b: 'bcg' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: 'a', b: 'b', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acg', b: 'bcg', c: 'ccg' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 23
    it('accepts generic sanitizer on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            genericCustomSanitizer
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            genericCustomSanitizer
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            genericCustomSanitizer
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a=a&b=b&c=c'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acg', b: 'bcg', c: 'ccg' });

            // Part 2
            request = { method: 'GET', url: '/paramsTestPerRoute/a/b' };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acg', b: 'bcg' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: 'a', b: 'b', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acg', b: 'bcg', c: 'ccg' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 24
    it('accepts custom query sanitizer, custom param sanitizer, custom payload sanitizer', async () => {
        try {
            await server.register({
                plugin: Avert,
                options: {
                    queryCustomSanitizer,
                    paramCustomSanitizer,
                    payloadCustomSanitizer
                }
            });

            server.route(routes);

            // Part 1
            let request = { method: 'GET', url: '/queryTest?a=a&b=b&c=c' };
            let res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acq', b: 'bcq', c: 'ccq' });

            // Part 2
            request = { method: 'GET', url: '/paramsTest/a/b' };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acp', b: 'bcp' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTest',
                payload: { a: 'a', b: 'b', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acpay', b: 'bcpay', c: 'ccpay' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });

    // Test # 25
    it('accepts custom query sanitizer, custom param sanitizer, custom payload sanitizer on a per route basis', async () => {
        try {
            await server.register({ plugin: Avert, options: {} });

            server.route(routes);

            server.route({
                method: 'GET',
                path: '/queryTestPerRoute',
                handler: (request, h) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        avert: {
                            queryCustomSanitizer
                        }
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, h) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        avert: {
                            paramCustomSanitizer
                        }
                    }
                }
            });

            server.route({
                method: 'POST',
                path: '/payloadTestPerRoute',
                handler: (request, h) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        avert: {
                            payloadCustomSanitizer
                        }
                    }
                }
            });

            // Part 1
            let request = {
                method: 'GET',
                url: '/queryTestPerRoute?a=a&b=b&c=c'
            };
            let res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acq', b: 'bcq', c: 'ccq' });

            // Part 2
            request = { method: 'GET', url: '/paramsTestPerRoute/a/b' };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acp', b: 'bcp' });

            // Part 3
            request = {
                method: 'POST',
                url: '/payloadTestPerRoute',
                payload: { a: 'a', b: 'b', c: 'c' }
            };
            res = await server.inject(request);

            expect(res.statusCode).to.be.equal(200);
            expect(res.result).to.equal({ a: 'acpay', b: 'bcpay', c: 'ccpay' });
        } catch (err) {
            expect(err).to.not.exist();
        }
    });
});
