var engine = {};
var babScriptTester = {
    startBalance: 0
    , timeToStop: false
    , crashList: []
    , balance: this.startBalance
    , currentCrash: 0
    , lowestBalance: this.balance
    , gamesSinceUpdate: 0
    , alreadyCalcd: false
    , lastPlayedGameWon: false
    , lastGamePlayed: false
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
babScriptTester.startCalculation = function () {
    babScriptTester.startBalance = parseInt(document.getElementById("startBalInput").value) * 100;
    babScriptTester.balance = babScriptTester.startBalance;
    babScriptTester.lowestBalance = babScriptTester.balance;
    if (babScriptTester.alreadyCalcd) {
        location.reload();
    }
    else {
        babScriptTester.alreadyCalcd = true;
        eval(document.getElementById("scriptText").value);
        babScriptTester.genOutcomes(document.getElementById("endHash").value, parseInt(document.getElementById("backAmount").value));
        for (var iterator = 0; iterator < babScriptTester.crashList.length; iterator++) {
            babScriptTester.gamesSinceUpdate++;
            babScriptTester.currentCrash = babScriptTester.crashList[iterator];
            engine.game_starting({
                game_id: "1"
                , time_till_start: 5000
            });
            if (babScriptTester.timeToStop) {
                break;
            }
            engine.game_started({});
            if (babScriptTester.timeToStop) {
                break;
            }
            console.log("Crashing at: " + babScriptTester.currentCrash);
            engine.game_crash({
                game_crash: babScriptTester.currentCrash * 100
            });
            if (babScriptTester.gamesSinceUpdate) {
                babScriptTester.lastGamePlayed = false;
            }
            else {
                babScriptTester.lastGamePlayed = true;
            }
            console.log("Balance: " + ((babScriptTester.balance) / 100));
        }
        document.getElementById("startBal").innerHTML = Math.round(babScriptTester.startBalance) / 100;
        document.getElementById("lowestBal").innerHTML = Math.round(babScriptTester.lowestBalance) / 100;
        document.getElementById("lowestNet").innerHTML = Math.round(babScriptTester.lowestBalance - babScriptTester.startBalance) / 100;
        document.getElementById("balance").innerHTML = Math.round(babScriptTester.balance) / 100;
        document.getElementById("netProfit").innerHTML = Math.round(babScriptTester.balance - babScriptTester.startBalance) / 100;
    }
}
engine.player_bet = function () {}
engine.game_starting = function () {}
engine.game_started = function () {}
engine.game_crash = function () {}
engine.getUsername = function () {
    return "usersUsername";
}
engine.getBalance = function () {
    return babScriptTester.balance;
}
engine.on = function (identifier, response) {
    engine[identifier] = response;
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
engine.placeBet = function (bet, multiplier) {
    babScriptTester.gamesSinceUpdate = 0;
    if (babScriptTester.timeToStop) {
        return;
    }
    engine.player_bet({
        username: "usersUsername"
        , index: 0
    });
    babScriptTester.balance -= bet;
    if (multiplier <= babScriptTester.currentCrash * 100) {
        babScriptTester.balance += bet * (multiplier / 100);
        engine.cashed_out({
            username: "usersUsername"
            , stopped_at: multiplier
        });
        babScriptTester.lastPlayedGameWon = true;
    }
    else {
        babScriptTester.lastPlayedGameWon = false;
    }
    if (babScriptTester.balance < babScriptTester.lowestBalance) {
        babScriptTester.lowestBalance = babScriptTester.balance;
    }
}
document.getElementById("startCalc").addEventListener("click", babScriptTester.startCalculation);