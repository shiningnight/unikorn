let u = {};
const nonce_charas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';

function msToSec(ms) {
    return parseInt(ms.toString().slice(0, -3), 10);
}

u.stamp = function () {
    return Date.now();
};

u.dayStartStamp = function () {
    let midnight = new Date();
    midnight.setHours(0);
    midnight.setMinutes(0);
    midnight.setSeconds(0);
    midnight.setMilliseconds(0);
    return midnight.getTime();
};

u.isEmptyObject = function (obj) {
    let hasProp = false;
    if (typeof obj === "object") {
        for (let prop in obj) {
            hasProp = true;
            break;
        }
    } else {
        hasProp = true;
    }
    return !hasProp;
};

u.isArray = function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
};

u.isEmptyArray = function (arr, threshold = 1) {
    let empty = false;
    if (this.isArray(arr)) {
        if (arr.length == 0) {
            empty = true;
        }
        else if (threshold > 1) {
            let valid_counter = 0;
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] != 0) valid_counter++;
            }
            if (valid_counter < threshold) empty = true;
        }
    }
    return empty;
};

u.hasEmptyArray = function (obj, threshold = 1) {
    let empty = false;
    if (typeof obj === "object") {
        for (let prop in obj) {
            if (this.isEmptyArray(obj[prop], threshold)) {
                empty = true;
                break;
            }
        }
    }
    return empty;
};

u.parseNum = function (str, type = 'int') {
    let num;
    switch (type) {
        case 'int':
            num = parseInt(str, 10);
            break;
        case 'float':
            num = parseFloat(str);
            break;
    }
    return isNaN(num) ? 0 : num;
};

u.padNum = function (num, n) {
    return (Array(n).join(0) + num).slice(-n);
};

u.nonce = function (len = 64) {
    let result = '';
    for (let i = 0; i < len; i++) {
        let idx = Math.floor(Math.random() * 63);
        result += nonce_charas[idx]
    }
    return result;
};

u.throttle = function (fn, interval) {
    let timer,
        isFirst = true;
    return function () {
        if (isFirst) {
            fn.apply(this, arguments);
            return isFirst = false;
        }
        if (timer) {
            return;
        }
        timer = setTimeout(() => {
            clearTimeout(timer);
            timer = null;
            fn.apply(this, arguments)
        }, interval || 1000);
    }
};

u.log = async function (msg) {
    if (typeof msg !== 'string') {
        msg = JSON.stringify(msg);
    }
    console.log(`[${new Date().toLocaleString()}] ${msg}`);
};

module.exports = u;