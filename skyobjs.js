
const C_SKY_CENTER_X = C_WIDTH/2;
const C_SKY_CENTER_Y = C_HEIGHT*1.2;
const C_SKY_MAX_RADIUS = Math.sqrt(Math.pow(C_SKY_CENTER_Y, 2) + Math.pow(C_SKY_CENTER_X, 2));
const C_SKY_MIN_RADIUS = Math.max(0, C_SKY_CENTER_Y - C_HEIGHT);
const C_REDIST_FACTOR_NEAR_QUADRATIC = 0.4;
const C_LUNAR_MONTH_MS = 29.53*C_ONE_DAY_MS;
const C_INITAL_ANGLE_FOR_NEW_MOON = 1.25*C_2PI;

/****************************************/
/*************** Star *******************/
/****************************************/

class Star {
    constructor(ctxList, posAngle, posRadius, r, color, twinking) {
        this.ctxList = ctxList;
        this.posAngle = posAngle;
        this.posRadius = posRadius;

        this.rawPosAngle = posAngle;

        this.x = C_SKY_CENTER_X + this.posRadius * Math.cos(this.posAngle);
        this.y = C_SKY_CENTER_Y + this.posRadius * Math.sin(this.posAngle);

        if (twinking) {
            this.rMax = r;
            this.rMin = r * (0.2 + Math.random() * 0.2);
            this.r = this.rMin + Math.random() * (this.rMax - this.rMin);
        } else {
            this.r = r;
        }

        this.rChange = 0.03 * (Math.random() * 0.2 + 0.9);
        this.color = color;
        this.shouldTwinking = twinking;
    }

    render() {
        if (this.x < 0 || this.x > C_WIDTH || this.y < 0 || this.y > C_HEIGHT) {
            return;
        }
        for (var ind in this.ctxList) {
            var ctx = this.ctxList[ind];
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
            ctx.shadowBlur = this.r * 10;
            ctx.shadowColor = "white";
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    update(nowAngleOffset) {
        this.posAngle = this.rawPosAngle + nowAngleOffset;

        this.x = C_SKY_CENTER_X + this.posRadius * Math.cos(this.posAngle);
        this.y = C_SKY_CENTER_Y + this.posRadius * Math.sin(this.posAngle);

        if (this.x < 0 || this.x > C_WIDTH || this.y < 0 || this.y > C_HEIGHT) {
            return;
        }

        if (this.shouldTwinking) {
            if (this.r > this.rMax || this.r + this.rChange < this.rMin) {
                this.rChange = -this.rChange;
            }
            this.r += this.rChange * (Math.random() * 0.2 + 0.8);
        }
    }
}

function randomStarColor() {
    var arrColors = ["ffffff", "ffecd3", "bfcfff"];
    return "#" + arrColors[Math.floor((Math.random() * 3))];
}

function createStars(ctxList, num, rRand, rBase, twinking) {
    var result = [];
    const outer = Math.pow(C_SKY_MAX_RADIUS*0.98, 2);
    const inner = Math.pow(C_SKY_MIN_RADIUS*1.02, 2);
    for (i = 0; i < num; i++) {
        const randPosAngle = 2*Math.PI*Math.random();
        const randPosRadius = Math.sqrt(Math.random()*(outer-inner) + inner);
        var randR = Math.random() * rRand + rBase;

        var star = new Star(ctxList, randPosAngle, randPosRadius, randR, randomStarColor(), twinking);
        result.push(star);
    }
    return result;
}

/***************************************/
/*************** Sun *******************/
/***************************************/

class Sun {
    constructor(ctxList, posAngle, posRadius, r, color) {
        this.ctxList = ctxList;
        this.posAngle = posAngle;
        this.posRadius = posRadius;
        this.r = r;
        this.color = color;
    }

    render() {
        // compute the (x, y) coordinate of the sun then render it with sun blurring effect
        var x = C_SKY_CENTER_X + this.posRadius * Math.cos(this.posAngle);
        var y = C_SKY_CENTER_Y + this.posRadius * Math.sin(this.posAngle);
        for (var ind in this.ctxList) {
            var ctx = this.ctxList[ind];
            ctx.beginPath();
            ctx.arc(x, y, this.r, 0, 2 * Math.PI, false);
            ctx.shadowBlur = 20;
            ctx.shadowColor = "white";
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    update(nowAngleOffset, dt) {
        this.posAngle = nowAngleOffset;
    }
}

function createSun(ctxList) {
    var sun = new Sun(ctxList, 0, C_SKY_MAX_RADIUS*0.8, 35, "#ffcc00");
    return sun;
}

/****************************************/
/*************** Moon *******************/
/****************************************/

const C_REF_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14));
const MOON_DAY_COLOR = [193, 208, 240];
const MOON_NIGHT_COLOR = [240, 240, 240];

class Moon {
    constructor(ctxList, posAngle, posRadius, r, color) {
        this.ctxList = ctxList;
        this.posAngle = posAngle;
        this.posRadius = posRadius;
        this.r = r;
        this.color = color;
        this.phase = 0;
        this.rotate = 0;
        this.blurNormalRadius = 20;
        this.blurFactor = 1;
    }

    render() {
        // compute the (x, y) coordinate of the moon then render it with moon blurring effect
        const x = C_SKY_CENTER_X + this.posRadius * Math.cos(this.posAngle);
        const y = C_SKY_CENTER_Y + this.posRadius * Math.sin(this.posAngle);
        if (x < -this.r*2 || x > C_WIDTH + this.r*2 || y < -this.r*2 || y > C_HEIGHT + this.r*2) {
            return;
        }
        const adjustedPhase = this.phase*4;
        var arcStart, epllipseLongAxis, ellipseCounterClockwise;
        if (this.phase <= 0.25) {
            arcStart = -0.5*Math.PI;
            epllipseLongAxis = 1 - adjustedPhase;
            ellipseCounterClockwise = true;
        } else if (this.phase <= 0.5) {
            arcStart = -0.5*Math.PI;
            epllipseLongAxis = adjustedPhase - 1;
            ellipseCounterClockwise = false;
        } else if (this.phase <= 0.75) {
            arcStart = 0.5*Math.PI;
            epllipseLongAxis = 3 - adjustedPhase;
            ellipseCounterClockwise = false;
        } else if (this.phase <= 1) {
            arcStart = 0.5*Math.PI;
            epllipseLongAxis = adjustedPhase - 3;
            ellipseCounterClockwise = true;
        }
        const arcEnd = arcStart + Math.PI;
        const ellipseStart = arcEnd;
        const ellipseEnd = arcStart;
        for (var ind in this.ctxList) {
            var ctx = this.ctxList[ind];
            ctx.beginPath();
            ctx.arc(x, y, this.r, arcStart+this.rotate, arcEnd+this.rotate, false);
            ctx.ellipse(x, y, this.r*epllipseLongAxis, this.r, this.rotate, ellipseStart, ellipseEnd, ellipseCounterClockwise);
            ctx.closePath();

            ctx.shadowBlur = this.blurNormalRadius*this.blurFactor;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    update(nowAngleOffset, dt, sunriseSec, sunsetSec, normalSec, midSec) {;
        var diffInMs = dt - C_REF_NEW_MOON;
        // lunar phase: 0.5 for full moon, 0/1 for new moon, 0~0.5 for waxing, 0.5~1 for waning
        this.phase = diffInMs % C_LUNAR_MONTH_MS / C_LUNAR_MONTH_MS;
        var initialAngle = C_INITAL_ANGLE_FOR_NEW_MOON - C_2PI * this.phase;
        this.posAngle = nowAngleOffset + initialAngle;
        /**
         * 计算依据：
         * 以新月为例，当月亮运行到晚上18点的时候，其旋转角度应当为0.25*PI
         * 而从月亮的当日0点的起始位置运行到18点，需要旋转 1.75*PI - initialAngle
         * 也就是说，月亮当日0点的旋转角度是 0.25*PI - (1.75*PI - initialAngle)
         * 即 initialAngle - 1.5*PI = initialAngle + 0.5*PI
         */
        const initialRotate = initialAngle + 0.5*Math.PI;
        this.rotate = initialRotate + nowAngleOffset;

        this.updateColor(dt, sunriseSec, sunsetSec, normalSec, midSec);
        this.updateBlur(dt, sunriseSec, sunsetSec, normalSec, midSec);

        if (dt.getHours() == 0) {
            console.log(dt, this.blurNormalRadius, this.phase, nowAngleOffset/C_2PI, this.posAngle/C_2PI*360%360, nowAngleOffset/C_2PI*360%360, initialAngle/C_2PI*360%360);
        }
    }

    updateColor(dt, sunriseSec, sunsetSec, normalSec, midSec) {
        const nowSec = dt.getHours()*3600 + dt.getMinutes()*60 + dt.getSeconds();
        if (nowSec < sunriseSec + midSec) {
            this.color = "rgb(" + MOON_NIGHT_COLOR[0] + ", " + MOON_NIGHT_COLOR[1] + ", " + MOON_NIGHT_COLOR[2] + ")";
        } else if (nowSec < sunriseSec + normalSec) {
            const ratio = (nowSec - sunriseSec - midSec) / midSec;
            const redColor = MOON_NIGHT_COLOR[0] + (MOON_DAY_COLOR[0] - MOON_NIGHT_COLOR[0]) * ratio;
            const greenColor = MOON_NIGHT_COLOR[1] + (MOON_DAY_COLOR[1] - MOON_NIGHT_COLOR[1]) * ratio;
            const blueColor = MOON_NIGHT_COLOR[2] + (MOON_DAY_COLOR[2] - MOON_NIGHT_COLOR[2]) * ratio;
            this.color = "rgb(" + redColor + ", " + greenColor + ", " + blueColor + ")";
        } else if (nowSec < sunsetSec - midSec - 2*normalSec) {
            this.color = "rgb(" + MOON_DAY_COLOR[0] + ", " + MOON_DAY_COLOR[1] + ", " + MOON_DAY_COLOR[2] + ")";
        } else if (nowSec < sunsetSec - midSec) {
            const ratio = (nowSec - sunsetSec + midSec + 2*normalSec) / normalSec / 2;
            const redColor = MOON_DAY_COLOR[0] + (MOON_NIGHT_COLOR[0] - MOON_DAY_COLOR[0]) * ratio;
            const greenColor = MOON_DAY_COLOR[1] + (MOON_NIGHT_COLOR[1] - MOON_DAY_COLOR[1]) * ratio;
            const blueColor = MOON_DAY_COLOR[2] + (MOON_NIGHT_COLOR[2] - MOON_DAY_COLOR[2]) * ratio;
            this.color = "rgb(" + redColor + ", " + greenColor + ", " + blueColor + ")";
        } else {
            this.color = "rgb(" + MOON_NIGHT_COLOR[0] + ", " + MOON_NIGHT_COLOR[1] + ", " + MOON_NIGHT_COLOR[2] + ")";
        }
    }

    updateBlur(dt, sunriseSec, sunsetSec, normalSec, midSec) {
        const nowSec = dt.getHours()*3600 + dt.getMinutes()*60 + dt.getSeconds();
        if (nowSec < sunriseSec - normalSec) {
            this.blurFactor = 1;
        } else if (nowSec < sunriseSec) {
            const ratio = (nowSec - sunriseSec + normalSec) / normalSec;
            this.blurFactor = 1 - ratio;
        } else if (nowSec < sunsetSec) {
            this.blurFactor = 0;
        } else if (nowSec < sunsetSec + normalSec) {
            const ratio = (nowSec - sunsetSec) / normalSec;
            this.blurFactor = ratio;
        } else {
            this.blurFactor = 1;
        }
        this.blurNormalRadius = (this.phase < 0.5 ? 5 + 30*this.phase : 35 - 30*this.phase);
    }
}

function createMoon(ctxList, offset, nowSec) {
    var moon = new Moon(ctxList, 0, C_SKY_MAX_RADIUS*0.8, 25, "#f0f0f0");
    moon.update(offset, new Date(nowSec*1000));
    return moon;
}

/***************************************/
/*************** All *******************/
/***************************************/

function animateSkyObjects(sun, moon, stars, varsGetter) {
    var vars = varsGetter();
    for (var i = 0; i < stars.length; i++) {
        stars[i].update(vars.globalNowAngleOffset);
    }
    sun.update(vars.globalNowAngleOffset, new Date(vars.globalNowSec*1000));
    moon.update(vars.globalNowAngleOffset, new Date(vars.globalNowSec*1000), vars.sunriseSec, vars.sunsetSec, vars.normalToChangeInSecs, vars.midToChangeInSecs);
    context.clearRect(0, 0, C_WIDTH, C_HEIGHT);
    for (var i = 0; i < stars.length; i++) {
        stars[i].render();
    }
    // sun.render();
    moon.render();
    requestAnimationFrame(animateSkyObjects.bind(null, sun, moon, stars, varsGetter));
}
