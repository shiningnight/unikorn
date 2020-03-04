process.env.NODE_ENV = 'development';
const Unikorn = require('./index');
let Router = require('koa-router');

let app = new Unikorn({exposed: true, io: {enabled: true, auth: {mode: 'simple', password: '111'}}});

let router = new Router();
router.get('/:cat', async (ctx, next) => {
    ctx.cat = ctx.params['cat'];
    await next();
});
router.get('/meow', ctx => {
    ctx.u.log(ctx.cat);
    ctx.sendRaw('<xml><ToUserName><![CDATA[aaaaa]]></ToUserName>\n' +
        '<FromUserName><![CDATA[bbbb]]></FromUserName>\n' +
        '<CreateTime>1528426817</CreateTime>\n' +
        '<MsgType><![CDATA[text]]></MsgType>\n' +
        '<Content><![CDATA[啊啊啊]]></Content>\n' +
        '<MsgId>6564543193765531820</MsgId>\n' +
        '</xml>','application/xml');
});
router.post('/', async (ctx, next) => {
    const data = ctx.request.body;
    ctx.u.log(ctx.header['content-type'] === ctx.request.type);
    ctx.send(20007, data);
});

app.en('/test', router);

app.start({koa: 80, io: 12666});