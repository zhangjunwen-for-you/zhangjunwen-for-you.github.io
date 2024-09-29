
const C_WIDTH = document.body.offsetWidth;
const C_HEIGHT = document.body.offsetHeight;
const C_2PI = Math.PI*2;
const C_ONE_DAY_SECS = 24*3600;
const C_ONE_DAY_MS = 24*3600*1000;
const C_LOCALE_OFFSET = 8*3600;

const initialTime = Date.now();

// 现实生活中的的1ms代表程序运行的多少毫秒
var tickUnitInMs = 1;

var refreshIntervalInMs = 1000;

class GlobalVariables {
    constructor() {
        this.globalNowSec = 0;
        this.globalNowAngleOffset = 0;
        this.sunriseSec = 0;
        this.sunsetSec = 0;
        this.normalToChangeInSecs = 0;
        this.midToChangeInSecs = 0;
    }

    update(nowSec, sunriseTime, sunsetTime, normalToChangeInSecs, midToChangeInSecs) {
        this.globalNowSec = nowSec;
        this.globalNowAngleOffset = (this.globalNowSec + C_LOCALE_OFFSET)/C_ONE_DAY_SECS*C_2PI;
        this.sunriseSec = sunriseTime;
        this.sunsetSec = sunsetTime;
        this.normalToChangeInSecs = normalToChangeInSecs;
        this.midToChangeInSecs = midToChangeInSecs;
    }
}

var globalVars = new GlobalVariables();

var context = canvas.getContext("2d");

canvas.width = C_WIDTH;
canvas.height = C_HEIGHT;
