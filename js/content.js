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
}





data_history = [];
last_peak = 0;
last_std_deviation = 0;
last_mean = 0;
payback = 0;
order_cooldown = 0;

config = {
    'active': {
        'up': false,
        'down': false
    },
    'bet_value': 2,
    'peak_variation': 1.5,
    'history_length': 1,
    'minimum_payback': 80,
    'order_cooldown': 10
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

previous_up_order_id = 0;
previous_down_order_id = 0;

function cancelPreviousUpOrder() {
    var data = [{
        "t": 2,
        "e": 41,
        "d": [{
            "id": previous_up_order_id,
            "pair": "Bitcoin",
            "dir": "up",
            "duration": 60,
            "status": "wait",
            "group": "demo",
            "amount": 2,
            "currency": "brl"
        }]
    }];
    data_socket.send(JSON.stringify(data));
}

function cancelPreviousDownOrder() {
    var data = [{
        "t": 2,
        "e": 41,
        "d": [{
            "id": previous_down_order_id,
            "pair": "Bitcoin",
            "dir": "up",
            "duration": 60,
            "status": "wait",
            "group": "demo",
            "amount": 2,
            "currency": "brl"
        }]
    }];
    data_socket.send(JSON.stringify(data));
}

function newUpOrder() {
    var data = [{
        "t": 2,
        "e": 40,
        "d": [{
            "amount": 2,
            "pair": "Bitcoin",
            "dir": "up",
            "group": "demo",
            "duration": 60,
            "winperc": config.minimum_payback,
            "course_target": last_mean - config.peak_variation
        }]
    }];
    data_socket.send(JSON.stringify(data));
}

function newDownOrder() {
    var data = [{
        "t": 2,
        "e": 40,
        "d": [{
            "amount": 2,
            "pair": "Bitcoin",
            "dir": "down",
            "group": "demo",
            "duration": 60,
            "winperc": config.minimum_payback,
            "course_target": last_mean + config.peak_variation
        }]
    }];
    data_socket.send(JSON.stringify(data));
}


data_socket.onmessage = function(message) {
    var receivedData = JSON.parse(message.data)[0];
    //receivedData.e == 1 -> Novos dados
    if (receivedData.e == 1) {
        receivedData = receivedData.d[0];
        if (data_history.length > 0) {
            last_mean = meanOfLastN(data_history, config.history_length);
            last_peak = receivedData.q - last_mean;
            if(!order_cooldown){
                if(config.active.up){
                    cancelPreviousUpOrder();
                    newUpOrder();
                    order_cooldown = 1;
                }
                if(config.active.down){
                    cancelPreviousDownOrder();
                    newDownOrder();
                    order_cooldown = 1;
                }
                if(order_cooldown){
                    setTimeout(function(){order_cooldown=0},1000*config.order_cooldown);
                }
            }
        }
        while (data_history.length >= config.history_length) {
            data_history.shift();
        }
        data_history.push(receivedData.q);
    }
    //receivedData.e == 80 -> Contém o payback
    if (receivedData.e == 80) {
        payback = receivedData.d[0].d[3].s[0].dw;
    }
    //receivedData.e == 40 -> Confirmação de order
    if (receivedData.e == 40 && receivedData.t == 3) {
        if(!receivedData.d){
            return;
        }
        receivedData = receivedData.d[0];
        if (receivedData.dir == "up") {
            previous_up_order_id = receivedData.id;
        } else {
            previous_down_order_id = receivedData.id;
        }
    }

}
