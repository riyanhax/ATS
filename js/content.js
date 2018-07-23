data_socket = new WebSocket("wss://olymptrade.com/ds/v2");

Array.prototype.stanDeviate = function() {
    var i, j, total = 0,
        mean = 0,
        diffSqredArr = [];
    for (i = 0; i < this.length; i += 1) {
        total += this[i];
    }
    mean = total / this.length;
    for (j = 0; j < this.length; j += 1) {
        diffSqredArr.push(Math.pow((this[j] - mean), 2));
    }
    return (Math.sqrt(diffSqredArr.reduce(function(firstEl, nextEl) {
        return firstEl + nextEl;
    }) / this.length));
};

data_socket.onopen = function() {
    var data = [{
        "t": 2,
        "e": 4,
        "uuid": "JJXTW4NRP1S8L1NBJB",
        "d": [{
            "p": "Bitcoin",
            "tf": 1
        }]
    }];
    data_socket.send(JSON.stringify(data));
    data = [{
        "t": 2,
        "e": 95,
        "uuid": "JJXW12OLVSLF994IY1",
        "d": [{
            "cat": "digital",
            "pair": "Bitcoin"
        }]
    }];
    data_socket.send(JSON.stringify(data));
    console.log("data socket started");
}





data_history = [];
last_peak = 0;
last_std_deviation = 0;
last_mean = 0;
payback = 0;

config = {
    'active': {
        'up': false,
        'down': false
    },
    'bet_value': 2,
    'peak_variation': 3,
    'history_length': 100,
    'minimum_payback': 80
}

function getState() {
    return {
        'config': config,
        'peak': last_peak,
        'mean': last_mean,
        'std_deviation': last_std_deviation,
        'payback': payback
    };
}

function meanOfLastN(data, n) {
    var result = 0;
    for (var i = 0; i < Math.min(n, data.length); i++) {
        result += data[data.length - 1 - i];
    }
    result /= Math.min(n, data.length);
    return result;
}

function newTrade(value, dir) {
    var date = new Date();

    var data = [{
        "t": 2,
        "e": 23,
        "d": [{
            "amount": 2,
            "dir": dir,
            "pair": "Bitcoin",
            "cat": "digital",
            "pos": 0,
            "source": "platform",
            "group": "demo",
            "timestamp": date.getTime(),
            "duration": 60
        }]
    }];
    data_socket.send(JSON.stringify(data));
    return;
}


data_socket.onmessage = function(message) {
    var data = JSON.parse(message.data)[0];
    if (data.e == 1) {
        data = data.d[0];
        while (data_history.length >= config.history_length) {
            data_history.shift();
        }
        data_history.push(data.q);
        if (data_history.length > 0) {
            last_std_deviation = data_history.stanDeviate();
            last_mean = meanOfLastN(data_history, config.history_length);
            last_peak = (data.q - last_mean) / last_std_deviation;
            if (config.active.down && last_peak > config.peak_variation && payback > config.minimum_payback) {
                //console.log(last_peak);
                newTrade(config.bet_value, "down");
            }
            if (config.active.up && last_peak < -1 * config.peak_variation && payback > config.minimum_payback) {
                //console.log(last_peak);
                newTrade(config.bet_value, "up");
            }
        }
    }
    if (data.e == 80) {
        payback = data.d[0].d[3].s[0].dw;
    }
}
