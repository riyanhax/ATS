//alert("Hello");

data_socket = new WebSocket("wss://olymptrade.com/ws2");

action_socket = new WebSocket("wss://olymptrade.com/ds");

data_socket.onopen = function() {
    data = {
        "pair": "Bitcoin",
        "size": 1
    }
    data_socket.send(JSON.stringify(data));
    console.log("data socket started");
}

action_socket.onopen = function() {
    var date = new Date();
    data = [{
            "type": "push",
            "uuid": "JJOSRQB4KVWL6P7R64",
            "event_name": "source:set",
            "data_type": "source",
            "timestamp": date.getTime(),
            "data": [{
                "source": "platform"
            }]
        },
        {
            "type": "push",
            "uuid": "JJOTJ4EW8DWHAAQY8MV",
            "event_name": "api_version:set",
            "data_type": "api_version",
            "timestamp": date.getTime(),
            "data": [{
                "ver": 2
            }]
        },
        {
            "type": "request",
            "uuid": "JJOSRQB41EC8IPUMI71",
            "event_name": "pair_active:set",
            "data_type": "pair_active",
            "data": [{
                "cat": "digital",
                "pair": "Bitcoin"
            }],
            "timestamp": Math.round(date.getTime() / 1000),
        }
    ];
    action_socket.send(JSON.stringify(data));
    console.log("action socket started");
}





data_history = [];
last_variation = 0;

config = {
    'active': {
        'up': false,
        'down': false
    },
    'bet_value': 2,
    'peak_variation': 1.5,
    'history_length': 5
}

function getState() {
    return {
        'config': config,
        'peak': last_variation,
        'mean': meanOfLastN(data_history, config.history_length)
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
    data = [{
        "data_type": "deal_open",
        "event_name": "deals:demo:opening",
        "timestamp": Math.round(date.getTime() / 1000),
        "type": "request",
        "data": [{
            "amount": value,
            "cat": "digital",
            "dir": dir,
            "duration": 60,
            "group": "demo",
            "pair": "Bitcoin",
            "pos": 0,
            "source": "platform",
            "timestamp": date.getTime()
        }]
    }];
    action_socket.send(JSON.stringify(data));
    alert(last_variation);
}


data_socket.onmessage = function(message) {
    data = JSON.parse(message.data);
    if (data.hasOwnProperty('close')) {

        if (data_history.length > 0) {
            last_variation = data.close - meanOfLastN(data_history, config.history_length);
            if (config.active.down && data.close > meanOfLastN(data_history, config.history_length) + config.peak_variation) {
                //console.log("new trade: down");
                newTrade(config.bet_value, "down");
            }
            if (config.active.up && data.close < meanOfLastN(data_history, config.history_length) - config.peak_variation) {
                //console.log("new trade: up");
                newTrade(config.bet_value, "up");
            }
        }

        if (data_history.length >= config.history_length) {
            data_history.shift();
        }

        data_history.push(data.close);
    }
}
