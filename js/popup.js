function updateState() {
    chrome.tabs.executeScript({
            code: `getState();`
        },
        function(result) {
            config = result[0].config;
            state = result[0];
            document.getElementById("state_active_up").innerText = config.active.up;
            document.getElementById("state_active_down").innerText = config.active.down;
            document.getElementById("state_peak_variation").innerText = config.peak_variation;
            document.getElementById("state_history_length").innerText = config.history_length;
            document.getElementById("mean").innerText = state.mean;
            document.getElementById("peak").innerText = state.peak;
        }
    );
    setTimeout(updateState, 1000);
}

function toggleActiveUp() {
    chrome.tabs.executeScript({
        code: `config.active.up = !config.active.up;`
    });
    updateState();
}

function toggleActiveDown() {
    chrome.tabs.executeScript({
        code: `config.active.down = !config.active.down;`
    });
    updateState();
}

function setPeakVariation() {
    chrome.tabs.executeScript({
        code: `config.peak_variation = ` + document.getElementById('peak_variation').value + `;`
    });
    updateState();
}

function setHistoryLength() {
    chrome.tabs.executeScript({
        code: `config.history_length = ` + document.getElementById('history_length').value + `;`
    });
    updateState();
}

document.getElementById('toggle_active_up').addEventListener('click', toggleActiveUp);
document.getElementById('toggle_active_down').addEventListener('click', toggleActiveDown);
document.getElementById('set_peak_variation').addEventListener('click', setPeakVariation);
document.getElementById('set_history_length').addEventListener('click', setHistoryLength);

updateState();
