
var [sunriseTime, sunsetTime] = getSunRiseSetV2(new Date(initialTime), 39.9, 116.5);
globalVars.update(initialTime/1000, sunriseTime, sunsetTime, 30*60, 15*60);

var moon = createMoon([context], globalVars.globalNowAngleOffset, globalVars.globalNowSec);
var sun = createSun([context]);
var arrStars = [];
arrStars.push(...createStars([context], 520, 1.5, .5, true));
arrStars.push(...createStars([context], 1314, 0.7, .3, false));
arrStars.push(...createStars([context], 202, 0.3, .3, false));

var cacheDate = 0;
function refreshAll() {
    const actualNow = new Date();
    const actualDiffInMs = actualNow - initialTime;
    const usingDiffInMs = actualDiffInMs*tickUnitInMs;
    const usingNow = new Date(initialTime + usingDiffInMs);

    var [sunriseTime, sunsetTime] = getSunRiseSetV2(usingNow, 39.9, 116.5);
    const maxSpeedForExchange = 6000;
    const speed = Math.min(tickUnitInMs, maxSpeedForExchange);
    const normalToChangeInSecs = (240*speed/maxSpeedForExchange + 30)*60;
    const midToChangeInSecs = normalToChangeInSecs/2;
    if (cacheDate == 0 || cacheDate.getMonth() != usingNow.getMonth() || cacheDate.getDate() != usingNow.getDate()) {
        cacheDate = usingNow;
        resetBgConf(sunriseTime, sunsetTime, normalToChangeInSecs, midToChangeInSecs);
    }
    doChangeBackgroundV2(usingNow, false);
    globalVars.update(usingNow/1000, sunriseTime, sunsetTime, normalToChangeInSecs, midToChangeInSecs);

    setTimeout(refreshAll, refreshIntervalInMs);
}

function startSimulate(speed, interval) {
    tickUnitInMs = speed;
    refreshIntervalInMs = interval;
}

var count = 0;
var last_index = 0;
function randomText(e) {
    var choices = ["❤", "Z", "J", "W", "D", "K", "Q", "❤", "Z", "J", "W", "D", "K", "Q"];
    if (count > 3) {
        choices.push("D ❤ Z", "Z ❤ D");
    }
    var index = Math.floor(Math.random() * choices.length);
    if (index == last_index) {
        index++;
        last_index = index;
    }
    mtext.innerText = choices[index];
    var colorRed = Math.floor(Math.random() * 200 + 1);
    var colorGreen = Math.floor(Math.random() * colorRed + 1);
    var colorBlue = Math.floor(Math.random() * 30 + colorRed);
    mtext.style.color = "rgb(" + colorRed + ", " + colorGreen + ", " + Math.min(colorBlue, 255) + ")";
    mtext.classList.remove("thidden");
    count++;
    return false;
}

function hideText(e) {
    mtext.classList.add("thidden");
    return false;
}

function setSpeedGradually(targetSpeed, duration, interval, callback) {
    var currentSpeed = tickUnitInMs;
    var diff = targetSpeed - currentSpeed;
    var step = diff/duration*interval;
    var timer = setInterval(() => {
        currentSpeed += step;
        if (Math.abs(currentSpeed - targetSpeed) < Math.abs(step)) {
            clearInterval(timer);
            currentSpeed = targetSpeed;
            callback();
        }
        tickUnitInMs = currentSpeed;
    }, interval);
}

var speedingUpRunning = false;

function speedUpToNextStage(e) {
    if (speedingUpRunning) {
        return;
    }
    speedingUpRunning = true;
    const currentDays = Math.floor(globalVars.globalNowSec / C_ONE_DAY_SECS);
    const currentSecsInDay = globalVars.globalNowSec % C_ONE_DAY_SECS;
    var restoreSecs = currentDays * C_ONE_DAY_SECS;
    if (currentSecsInDay > globalVars.sunsetSec) {
        restoreSecs += C_ONE_DAY_SECS + globalVars.sunriseSec + globalVars.normalToChangeInSecs;
    } else if (currentSecsInDay < globalVars.sunriseSec) {
        restoreSecs += globalVars.sunriseSec + globalVars.normalToChangeInSecs;
    } else {
        restoreSecs += globalVars.sunsetSec + globalVars.normalToChangeInSecs;
    }

    refreshIntervalInMs = 5;
    setSpeedGradually(3000, 5000, 100, () => {});

    var timer = setInterval(() => {
        if (globalVars.globalNowSec > restoreSecs) {
            clearInterval(timer);
            setSpeedGradually(1, 5000, 100, ()=>{
                speedingUpRunning = false;
                refreshIntervalInMs = 1000;
            });
        }
    }, 100);
}

function startMain() {
    refreshAll();
    animateSkyObjectsV5(sun, moon, arrStars, ()=>globalVars);

    setTimeout(refreshAll, refreshIntervalInMs);

    document.oncontextmenu = (e) => {
        e.preventDefault()
        return false;
    }
    canvas.oncontextmenu = (e) => {
        e.preventDefault()
        return false;
    }
    mtext.oncontextmenu = (e) => {
        e.preventDefault()
        return false;
    }

    canvas.onmousedown = randomText;
    canvas.onmouseup = hideText;
    canvas.ontouchstart = randomText;
    canvas.ontouchend = hideText;

    next.onclick = speedUpToNextStage;
}

startMain();
