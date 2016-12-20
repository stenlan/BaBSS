var engine = {};
var babScriptTester = {
    startBalance: 0
    , timeToStop: false
    , crashList: []
    , makeChart: false
    , balance: this.startBalance
    , currentCrash: 0
    , listeners: {}
    , lowestBalance: this.balance
    , gamesSinceUpdate: 0
    , alreadyCalcd: false
    , lastPlayedGameWon: false
    , sheet: document.styleSheets[2]
    , force_color: "green"
    , lastGamePlayed: false
    , darkTheme: false
    , lastGame: 0
    , balanceLog: []
    , genOutcomes: function (hash, amount) {
        var lastHash = "";
        for (var i = 0; i < amount; i++) {
            var gameHash = (lastHash != "" ? this.genGameHash(lastHash) : hash);
            var gameCrash = this.crashPointFromHash((lastHash != "" ? this.genGameHash(lastHash) : hash));
            var clr = gameCrash > 1.97 ? 'green' : (gameCrash < 1.97 ? 'red' : 'blue');
            this.crashList.unshift(gameCrash);
            lastHash = gameHash;
        }
    }
    , divisible: function (hash, mod) {
        // So ABCDEFGHIJ should be chunked like  AB CDEF GHIJ
        var val = 0;
        var o = hash.length % 4;
        for (var i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
            val = ((val << 16) + parseInt(hash.substring(i, i + 4), 16)) % mod;
        }
        return val === 0;
    }
    , genGameHash: function (serverSeed) {
        return CryptoJS.SHA256(serverSeed).toString();
    }
    , hmac: function (key, v) {
        var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
        return hmacHasher.finalize(v).toString();
    }
    , crashPointFromHash: function (serverSeed) {
        // see: provably fair seeding event
        var hash = this.hmac(serverSeed, '000000000000000007a9a31ff7f07463d91af6b5454241d5faf282e5e0fe1b3a');
        // In 1 of 101 games the game crashes instantly.
        if (this.divisible(hash, 101)) return 0;
        // Use the most significant 52-bit from the hash to calculate the crash point
        var h = parseInt(hash.slice(0, 52 / 4), 16);
        var e = Math.pow(2, 52);
        return (Math.floor((100 * e - h) / (e - h)) / 100).toFixed(2);
    }
}
babScriptTester.toggleTheme = function () {
    babScriptTester.darkTheme = (babScriptTester.darkTheme == false);
    if (babScriptTester.darkTheme) {
        babScriptTester.sheet.insertRule("legend {color: #FFF;}", 22);
        babScriptTester.sheet.insertRule("label {color: #FFF;}", 23);
        babScriptTester.sheet.insertRule("th {color: #FFF;}", 24);
        document.body.style.backgroundColor = "#181a1e";
    }
    else {
        babScriptTester.sheet.deleteRule(22);
        babScriptTester.sheet.deleteRule(22);
        babScriptTester.sheet.deleteRule(22);
        document.body.style.backgroundColor = "#FFF";
    }
}
babScriptTester.simulateFromAuto = function (baseBetInBits, autoCashoutAt, stopAtBits, onLossReturnToBaseBet, onWinReturnToBaseBet, increaseBetByOnLoss, increaseBetByOnWin) {
    var baseBet = baseBetInBits * 100;
    var autoCashoutAtPercentage = autoCashoutAt * 100;
    var stopAtBiggerThan = stopAtBits * 100;
    var currentBet = baseBet;
    engine.on("game_starting", function (info) {
        if (engine.lastGamePlay() == "WON") { //won
            if (onWinReturnToBaseBet) {
                currentBet = baseBet;
            }
            else {
                currentBet *= increaseBetByOnWin;
            }
        }
        else if (engine.lastGamePlay() == "LOST") {
            if (onLossReturnToBaseBet) {
                currentBet = baseBet;
            }
            else {
                currentBet *= increaseBetByOnLoss;
                currentBet = Math.round(currentBet);
            }
        }
        else if (engine.lastGamePlay() == "NOT_PLAYED") {
            currentBet = baseBet;
        }
        if (currentBet < stopAtBiggerThan) {
            engine.placeBet(currentBet, autoCashoutAtPercentage);
        }
        else {
            alert("Bet above maximum bet. Stopping simulation. All bets up and until this point have been simulated.");
            engine.stop();
        }
    });
}
babScriptTester.startCalculation = function () {
        babScriptTester.savePrefs();
        babScriptTester.makeChart = document.getElementById("chartCheckbox").checked;
        babScriptTester.startBalance = parseInt(document.getElementById("startBalInput").value) * 100;
        babScriptTester.balance = babScriptTester.startBalance;
        babScriptTester.lowestBalance = babScriptTester.balance;
        if (babScriptTester.alreadyCalcd) {
            location.reload();
        }
        else {
            babScriptTester.alreadyCalcd = true;
            if (document.getElementById("autoCheckbox").checked) {
                babScriptTester.simulateFromAuto(parseInt(document.getElementById("autoBaseBet").value), parseFloat(document.getElementById("autoAutoCashout").value).toFixed(2), parseInt(document.getElementById("autoStopAt").value), document.getElementById("lossRtbb").checked, document.getElementById("winRtbb").checked, parseFloat(document.getElementById("lossIbb").value), parseFloat(document.getElementById("winIbb").value));
            }
            else {
                eval(document.getElementById("scriptText").value);
            }
            babScriptTester.genOutcomes(document.getElementById("endHash").value, parseInt(document.getElementById("backAmount").value));
            if (babScriptTester.makeChart) {
                babScriptTester.prevBalance = babScriptTester.startBalance;
                babScriptTester.balanceLog.push({
                    n: 0
                    , balance: Math.round(babScriptTester.startBalance) / 100
                    , force_color: "green"
                });
            }
            for (var iterator = 0; iterator < babScriptTester.crashList.length; iterator++) {
                if (babScriptTester.timeToStop) {
                    break;
                }
                babScriptTester.gamesSinceUpdate++;
                babScriptTester.currentCrash = babScriptTester.crashList[iterator];
                babScriptTester.engineFunc("game_starting", {
                    game_id: "1"
                    , time_till_start: 5000
                });
                babScriptTester.engineFunc("game_started", {});
                console.log("Crashing at: " + babScriptTester.currentCrash);
                babScriptTester.engineFunc("game_crash", {
                    game_crash: babScriptTester.currentCrash * 100
                });
                if (babScriptTester.gamesSinceUpdate) {
                    babScriptTester.lastGamePlayed = false;
                }
                else {
                    babScriptTester.lastGamePlayed = true;
                }
                console.log("Balance: " + ((babScriptTester.balance) / 100));
                if (babScriptTester.makeChart) {
                    if (babScriptTester.prevBalance) {
                        babScriptTester.force_color = babScriptTester.prevBalance > babScriptTester.balance ? "red" : "green";
                    }
                    babScriptTester.balanceLog.push({
                        n: iterator + 1
                        , balance: Math.round(babScriptTester.balance) / 100
                        , force_color: babScriptTester.force_color
                    });
                    babScriptTester.prevBalance = babScriptTester.balance;
                }
                if (babScriptTester.timeToStop) {
                    babScriptTester.lastGame = iterator + 1;
                }
            }
            document.getElementById("numGames").innerHTML = babScriptTester.timeToStop ? babScriptTester.lastGame : babScriptTester.crashList.length;
            document.getElementById("startBal").innerHTML = Math.round(babScriptTester.startBalance) / 100;
            document.getElementById("lowestBal").innerHTML = Math.round(babScriptTester.lowestBalance) / 100;
            document.getElementById("lowestNet").innerHTML = Math.round(babScriptTester.lowestBalance - babScriptTester.startBalance) / 100;
            document.getElementById("balance").innerHTML = Math.round(babScriptTester.balance) / 100;
            document.getElementById("netProfit").innerHTML = Math.round(babScriptTester.balance - babScriptTester.startBalance) / 100;
            if (babScriptTester.makeChart) {
                babScriptTester.chart = AmCharts.makeChart("chartdiv", {
                    "type": "serial"
                    , "theme": babScriptTester.darkTheme ? "dark" : "light"
                    , "autoMargins": true
                    , "categoryField": "n"
                    , "valueAxes": [{
                        "id": "v1"
                        , "axisAlpha": 0
                        , "inside": true
                        , "title": "Balance"
    }]
                    , "graphs": [{
                        "id": "g1"
                        , "balloon": {
                            "drop": false
                            , "adjustBorderColor": false
                            , borderColor: "#000000"
                            , "color": "#ffffff"
                        }
                        , "bullet": "round"
                        , "bulletBorderAlpha": 1
                        , "bulletColor": "green"
                        , "lineColor": "green"
                        , "useNegativeColorIfDown": true
                        , bulletBorderColor: "#FFFFFF"
                        , "bulletBorderThickness": 2
                        , "negativeLineColor": "red"
                        , "bulletSize": 8
                        , colorField: "force_color"
                        , "lineThickness": 2
                        , "title": "red line"
                        , "valueField": "balance"
                        , "balloonText": "<span style='font-size:18px;'>[[value]]</span>"
    }]
                    , "chartScrollbar": {
                        "graph": "g1"
                        , "oppositeAxis": false
                        , "offset": 30
                        , "scrollbarHeight": 80
                        , "backgroundAlpha": 0
                        , "selectedBackgroundAlpha": 0.1
                        , "selectedBackgroundColor": "#888888"
                        , "graphFillAlpha": 0
                        , "graphLineAlpha": 0.5
                        , "selectedGraphFillAlpha": 0
                        , "selectedGraphLineAlpha": 1
                        , "autoGridCount": true
                        , "color": "#AAAAAA"
                    }
                    , "chartCursor": {
                        "cursorColor": "black"
                    }
                    , "categoryAxis": {
                        "dashLength": 1
                        , "minorGridEnabled": true
                    }
                    , "export": {
                        "enabled": true
                    }
                    , "dataProvider": babScriptTester.balanceLog
                });
                babScriptTester.chart.addListener("rendered", zoomChart);
                zoomChart();
            }
        }
    }
    /*engine.player_bet = function () {}
    engine.game_starting = function () {}
    engine.game_started = function () {}
    engine.game_crash = function () {}
    engine.cashed_out = function (args) {}*/
engine.getUsername = function () {
    return "usersUsername";
}
engine.getBalance = function () {
    return babScriptTester.balance;
}
engine.on = function (identifier, response) {
    if (babScriptTester.listeners[identifier]) {
        babScriptTester.listeners[identifier][babScriptTester.listeners[identifier].length] = response;
    }
    else {
        babScriptTester.listeners[identifier] = [];
        babScriptTester.listeners[identifier][0] = response;
    }
}
babScriptTester.engineFunc = function (identifier, argument) {
    if (babScriptTester.listeners[identifier]) {
        for (var i = 0; i < babScriptTester.listeners[identifier].length; i++) {
            babScriptTester.listeners[identifier][i](argument);
        }
    }
}
babScriptTester.savePrefs = function () {
    var inputElements = document.getElementsByTagName("input");
    var textareaElement = document.getElementsByTagName("textarea")[0];
    for (var i = 0; i < inputElements.length; i++) {
        if (inputElements[i].type == "text") {
            localStorage.setItem(inputElements[i].id, inputElements[i].value);
        }
        else if (inputElements[i].type == "checkbox" || inputElements[i].type == "radio") {
            localStorage.setItem(inputElements[i].id, inputElements[i].checked);
        }
    }
    localStorage.setItem(textareaElement.id, textareaElement.value);
}
engine.stop = function () {
    babScriptTester.timeToStop = true;
}
engine.chat = function (args) {}
engine.cashOut = function () {
    alert("Simulation stopping. engine.cashOut() used. Time-based cashouts are not supported");
    engine.stop();
}
engine.getCurrentPayout = function () {
    alert("engine.getCurrentPayout() used. Time-based cashouts are not supported");
    return 0;
}
engine.getMaxBet = function () {
    return 100000000;
}
engine.getMaxWin = function () {
    return 2200000000;
}
engine.lastGamePlayed = function () {
    return babScriptTester.lastGamePlayed;
}
engine.lastGamePlay = function () {
    if (!engine.lastGamePlayed()) {
        return "NOT_PLAYED";
    }
    else {
        return babScriptTester.lastPlayedGameWon ? "WON" : "LOST";
    }
}

function zoomChart() {
    babScriptTester.chart.zoomToIndexes(babScriptTester.chart.dataProvider.length - 40, babScriptTester.chart.dataProvider.length - 1);
    setTimeout(function () {
        document.getElementById("chartdiv").style.overflow = "hidden";
    }, 500);
}
engine.placeBet = function (bet, multiplier) {
    if (babScriptTester.balance - bet < 0) {
        alert("Attempted to make bet higher than balance, so can't bet anymore. All bets up and until this point have been simulated.");
        bet = 0;
        engine.stop();
    }
    babScriptTester.gamesSinceUpdate = 0;
    if (babScriptTester.timeToStop) {
        return;
    }
    babScriptTester.engineFunc("player_bet", {
        username: "usersUsername"
        , index: 0
    });
    babScriptTester.balance -= bet;
    if (multiplier <= babScriptTester.currentCrash * 100) {
        babScriptTester.balance += bet * (multiplier / 100);
        babScriptTester.engineFunc("cashed_out", {
            username: "usersUsername"
            , stopped_at: multiplier
        });
        babScriptTester.lastPlayedGameWon = true;
    }
    else {
        babScriptTester.lastPlayedGameWon = false;
    }
    if (babScriptTester.balance < 0) {
        alert("Negative balance (out of money), so can't bet anymore. All bets up and until this point have been simulated.");
        engine.stop();
    }
    if (babScriptTester.balance < babScriptTester.lowestBalance) {
        babScriptTester.lowestBalance = babScriptTester.balance;
    }
}
window.onload = function () {
    var inputElements = document.getElementsByTagName("input");
    var textareaElement = document.getElementsByTagName("textarea")[0];
    for (var i = 0; i < inputElements.length; i++) {
        if (localStorage.getItem(inputElements[i].id)) {
            if (inputElements[i].type == "text") {
                inputElements[i].value = localStorage.getItem(inputElements[i].id);
            }
            else if (inputElements[i].type == "checkbox" || inputElements[i].type == "radio") {
                inputElements[i].checked = localStorage.getItem(inputElements[i].id) == "true";
            }
        }
    }
    if (localStorage.getItem(textareaElement.id)) {
        textareaElement.value = localStorage.getItem(textareaElement.id);
    }
};
document.getElementById("switchTheme").addEventListener("click", babScriptTester.toggleTheme);
document.getElementById("startCalcBtn").addEventListener("click", babScriptTester.startCalculation);