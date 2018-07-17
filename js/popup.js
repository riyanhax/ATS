function updateState() {
  chrome.tabs.executeScript({
      code: `getConfigs();`
    },
    function(result) {
      config = result[0];
      document.getElementById("state_active_up").innerText = config.active.up;
      document.getElementById("state_active_down").innerText = config.active.down;
      document.getElementById("peak_variation").value = config.peak_variation;
      document.getElementById("history_length").value = config.history_length;
    }
  );
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
    code: `config.peak_variation = `+document.getElementById('peak_variation').value+`;`
  });
  updateState();
}

function setHistoryLength() {
  chrome.tabs.executeScript({
    code: `config.history_length = `+document.getElementById('history_length').value+`;`
  });
  updateState();
}

document.getElementById('toggle_active_up').addEventListener('click', toggleActiveUp);
document.getElementById('toggle_active_down').addEventListener('click', toggleActiveDown);
document.getElementById('set_peak_variation').addEventListener('click', setPeakVariation);
document.getElementById('set_history_length').addEventListener('click', setHistoryLength);

updateState();
