let fetch = require('node-fetch');
let Socketio = require('socket.io');
let ioAuth = require('socketio-auth');
let Koa = require('koa');
let Router = require('koa-router');
let logger = require('koa-logger');
let bodyParser = require('koa-bodyparser');
let xmlParser = require('koa-xml-body');
let helmet = require('koa-helmet');

let u = require('./u');

let Message = {
    10000: '请求成功',
    10001: '部分成功',
    20001: '内部错误',
    20002: '参数错误',
    20004: '数据库错误',
    20005: 'Token错误',
    20007: '指定资源不存在',
    20008: '用户不存在',
    20014: '资源已被占用',
    20015: '账户审核中，请耐心等待',
    30001: 'Token过期',
    30002: '无访问权限',
};

class Unicorn extends Koa {
    constructor(options) {
        const DEFAULTS = {
            exposed: false,
            allowEmptyResArr: false,
            io: {
                enabled: false,
                auth: {
                    path: '/socket.io',
                    mode: 'none',
                    password: ''
                }
            }
        };
        options = Object.assign({}, DEFAULTS, options);
        super();
        this.context.result = {};
        this.context.u = u;
        this.context.fetch = Unicorn.fetch;
        this.context.allowEmptyResArr = options.allowEmptyResArr;

        if (options.io.enabled) {
            let io = Socketio({ path: options.io.path });
            if (options.io.auth && options.io.auth.mode !== 'none') {
                if (options.io.auth.mode === 'simple') {
                    ioAuth(io, {
                        authenticate: (socket, data, callback) => {
                            //get credentials sent by the client
                            return callback(null, data.password === options.io.auth.password);
                        }
                    })
                } else {
                    throw new SyntaxError(`Socketio Auth mode ${options.io.auth.mode} not implented.`);
                }
            }
            this.io = io;
            this.context.io = io;
        }

        this.use(Unicorn.onError());
        this.use(helmet());
        if (process.env.NODE_ENV === 'development') {
            this.use(logger())
        }
        if (options.exposed) {
            this.use(Unicorn.cors());
        }
        this.use(Unicorn.registerUniSender());
        this.use(xmlParser({
            limit: '20mb',
            encoding: 'utf8',
            xmlOptions: {
                explicitArray: false
            }
        }));
        this.use(Unicorn.xmlBodyPreprocess());
        this.use(bodyParser({
            enableTypes: ['json', 'form'],
            jsonLimit: '20mb',
            formLimit: '20mb',
            strict: true
        }));
    }

    en(path, router) {
        router.prefix(path);
        this.use(router.routes());
        this.use(router.allowedMethods());
    }

    static async fetch(request) {
        let res = await fetch(request.url, {
            headers: { 'Connection': 'close' },
            method: request.method,
            body: request.body
        });
        return await res.json();
    }

    static onError() {
        return async function (ctx, next) {
            try {
                await next();
            } catch (e) {
                let code;
                switch (e.name) {
                    case 'MysqlError':
                        code = 20004;
                        break;
                    default:
                        if (e.code) {
                            code = e.code;
                        } else {
                            code = 20001;
                        }
                        break;
                }
                ctx.fail(code);
                ctx.u.log(e.stack);
            }
        };
    }

    static cors(options) {
        return async function (ctx, next) {
            const DEFAULTS = {
                origin: '*',
                allowMethods: 'GET,POST,DELETE,PUT,HEAD,OPTIONS,PATCH',
                allowHeaders: 'x-requested-with,content-type'
            };
            options = Object.assign({}, DEFAULTS, options);
            ctx.set('Access-Control-Allow-Origin', options.origin);
            ctx.set('Access-Control-Allow-Methods', options.allowMethods);
            ctx.set('Access-Control-Allow-Headers', options.allowHeaders);
            await next();
        }
    }

    static registerUniSender() {
        return async function (ctx, next) {
            ctx.sendRaw = (body, contentType = 'application/json') => {
                ctx.type = contentType;
                ctx.body = body;
            };
            ctx.send = (code, data = undefined) => {
                let status = '';
                if (code === 10000) {
                    status = "Success";
                }
                else {
                    status = "Error";
                    data = undefined;
                }
                ctx.sendRaw({
                    code: code,
                    status: status,
                    message: Message[code],
                    data: data
                });
            };
            ctx.fail = code => {
                ctx.send(code, undefined);
            };
            ctx.ok = data => {
                ctx.send(10000, data);
            };
            ctx.sendNotNull = data => {
                if (data == null || ctx.u.isEmptyObject(data) || (!ctx.allowEmptyResArr && ctx.u.hasEmptyArray(data))) {
                    ctx.fail(20007);
                } else {
                    ctx.ok(data);
                }
            };
            await next();
        }
    }

    static xmlBodyPreprocess() {
        return async function (ctx, next) {
            if (ctx.request.type.toLowerCase() === 'application/xml') {
                ctx.request.body = ctx.request.body.xml;
            }
            await next();
        }
    }

    start(port) {
        super.listen(port.koa);
        if (this.io) {
            this.io.listen(port.io);
        }
    }

}

Unicorn.Router = Router;

Unicorn.m = {
    errorInterceptor: async function (ctx, next) {
        if (ctx.result.code !== 10000) {
            ctx.fail(ctx.result.code);
        } else {
            await next();
        }
    },
    successInterceptor: async function (ctx, next) {
        if (ctx.result.code === 10000) {
            ctx.fail(20014)
        } else {
            await next();
        }
    },
    vacantInterceptor: async function (ctx, next) {
        if (ctx.result.code !== 20007) {
            ctx.fail(20014)
        } else {
            await next();
        }
    }
};

module.exports = Unicorn;
