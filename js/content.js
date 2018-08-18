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


config = {
    'active': {
        'up': false,
        'down': false,
        'all': false
    },
    'initial_bet': 2,
    'peak_variation': 1.5,
    'history_length': 1,
    'minimum_payback': 80,
    'order_cooldown': 10,
    'multiplier': 2,
    'auto_multiplier': false,
    'maximum_bet': 400
}


data_history = [];
last_peak = 0;
last_std_deviation = 0;
last_mean = 0;
payback = 0;
order_cooldown = 0;
last_dir = "down";
next_bet = config.initial_bet;



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

function newTrade(dir,amount) {
    var date = new Date();
    var data = [{
        "t": 2,
        "e": 23,
        "d": [{
            "amount": amount,
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

function newOrder(dir,amount) {
    var data = [{
        "t": 2,
        "e": 40,
        "d": [{
            "amount": amount,
            "pair": "Bitcoin",
            "dir": dir,
            "group": "demo",
            "duration": 60,
            "winperc": config.minimum_payback,
            "course_target": last_mean - config.peak_variation
        }]
    }];
    data_socket.send(JSON.stringify(data));
}

function newUpOrder(amount) {
    var data = [{
        "t": 2,
        "e": 40,
        "d": [{
            "amount": amount,
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

function newDownOrder(amount) {
    var data = [{
        "t": 2,
        "e": 40,
        "d": [{
            "amount": amount,
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
    var data = JSON.parse(message.data);
    for(i=0;i<data.length;i++){
        receivedData = data[i];
        //receivedData.e == 1 -> Novos dados
        if (receivedData.e == 1) {
            receivedData = receivedData.d[0];
            if (data_history.length > 0) {
                last_mean = meanOfLastN(data_history, config.history_length);
                last_peak = receivedData.q - last_mean;
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
        //receivedData.e == 26 -> Resultado da trade
        if(receivedData.e == 26){
            status = receivedData.d[0].interim_status;
            balance_change = receivedData.d[0].interim_balance_change;
            if(status=="cancel"){
                return;
            }
            if(status=="win"){
                next_bet = config.initial_bet;
            }
            main();
        }
    }
}

function main(){
    if(!config.active.all||payback < config.minimum_payback){
        setTimeout(function(){main();},1000);
        return;
    }
    if(last_dir=="down"){
        last_dir="up";
    }else{
        last_dir="down";
    }
    newTrade(last_dir,next_bet);
    if(config.auto_multiplier){
        aux_payback = 1 + (payback/100);
        next_bet = next_bet*(aux_payback/(aux_payback-1));
    }else{
        next_bet = next_bet*config.multiplier;
    }
    if(next_bet>config.maximum_bet){
        next_bet = config.initial_bet;
    }
}

setTimeout(function(){main();},1000);
