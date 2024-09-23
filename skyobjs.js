
const C_SKY_CENTER_X = C_WIDTH/2;
const C_SKY_CENTER_Y = C_HEIGHT*1.2;
const C_SKY_MAX_RADIUS = Math.sqrt(Math.pow(C_SKY_CENTER_Y, 2) + Math.pow(C_SKY_CENTER_X, 2));
const C_SKY_MIN_RADIUS = Math.max(0, C_SKY_CENTER_Y - C_HEIGHT);
const C_MAX_MOVE_ON_X = 50;

const C_SUN_RADIUS = 30;
const C_MOON_RADIUS = 25;

const C_ORBIT_SEASON_ADJUST = 0.3;

const C_SUN_ORBIT_RADIUS = C_HEIGHT - C_SUN_RADIUS;
const C_MOON_ORBIT_RADIUS = C_HEIGHT - C_MOON_RADIUS;

const C_SUN_MOON_ORBIT_BASE = C_HEIGHT - Math.cos(Math.PI - C_2PI*(4*3600+45*60)/C_ONE_DAY_SECS) * C_SUN_ORBIT_RADIUS * C_ORBIT_SEASON_ADJUST;

/****************************************/
/*************** Util *******************/
/****************************************/

function alphaAccordingToOther(x, y, otherX, otherY, invisibleDist, invisibleBeginDist) {
    const distToSun = Math.sqrt(Math.pow(x - otherX, 2) + Math.pow(y - otherY, 2));
    if (distToSun > invisibleBeginDist + invisibleDist) {
        return 1;
    }
    const ratio = (distToSun - invisibleDist)/(invisibleBeginDist - invisibleDist);
    return Math.max(0, ratio);
}

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
        this.alpha = 1;
        this.shouldTwinking = twinking;
    }

    render() {
        if (this.x < 0 || this.x > C_WIDTH || this.y < 0 || this.y > C_HEIGHT) {
            return;
        }
        if (this.alpha <= 1e-6) {
            return;
        }
        for (var ind in this.ctxList) {
            var ctx = this.ctxList[ind];
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
            ctx.shadowBlur = this.r * 10;
            ctx.shadowColor = "white";
            ctx.fillStyle = arrToRGBA([this.color[0], this.color[1], this.color[2], this.alpha]);
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

    getAlphaAccordingToObj(obj, invisibleDist, invisibleBeginDist) {
        if (!obj.isVisible()) {
            return 1;
        }
        if (Math.abs(this.x - obj.x) > invisibleBeginDist || Math.abs(this.y - obj.y) > invisibleBeginDist) {
            return 1;
        }
        return alphaAccordingToOther(this.x, this.y, obj.x, obj.y, invisibleDist, invisibleBeginDist);
    }

    updateAlphaAccordingTo(sun, moon) {
        const moonFactor = 1 - Math.abs(moon.phase - 0.5)/0.5;
        const alpha1 = this.getAlphaAccordingToObj(moon, moon.r*(1+0.5*moonFactor), moon.r*(1+1.5*moonFactor));
        const alpha2 = this.getAlphaAccordingToObj(sun, sun.r*2, sun.r*4);
        this.alpha = Math.min(alpha1, alpha2);
    }
}

function randomStarColor() {
    var arrColors = [[0xff, 0xff, 0xff], [0xff, 0xec, 0xd3], [0xbf, 0xcf, 0xff]];
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

const C_REF_SUN_MID_WINTER = new Date(Date.UTC(2023, 11, 22, 12, 0));
const C_SUN_YEAR_MS = 365.242199*24*60*60*1000;

const C_SUN_NORMAL_COLOR = [0xff, 0xee, 0xee];
const C_SUN_WARM_COLOR = [0xff, 0xdd, 0x66];

class Sun {
    constructor(ctxList, posAngle, posRadius, r, color) {
        this.ctxList = ctxList;
        this.posAngle = posAngle;
        this.posRadius = posRadius;
        this.r = r;
        this.color = color;
        this.orbitX = C_SKY_CENTER_X;
        this.orbitY = C_HEIGHT;
        this.x = C_SKY_CENTER_X + this.posRadius * Math.cos(this.posAngle);
        this.y = this.orbitY + this.posRadius * Math.sin(this.posAngle);
    }

    render() {
        if (this.x < -this.r*2 || this.x > C_WIDTH + this.r*2 || this.y < -this.r*2 || this.y > C_HEIGHT + this.r*2) {
            return;
        }

        for (var ind in this.ctxList) {
            var ctx = this.ctxList[ind];
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
            ctx.shadowBlur = 30;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    update(nowAngleOffset, dt, sunriseSec, sunsetSec, normalSec, midSec) {
        this.posAngle = nowAngleOffset + 0.5*Math.PI;

        const offsetRatio = (dt - C_REF_SUN_MID_WINTER) % C_SUN_YEAR_MS / C_SUN_YEAR_MS;
        // 一年中的每天的同一时刻，太阳形成的轨迹呈现8字形
        // 冬至 -> 春分：冬至最低，先向东偏移，再向西偏移，大约春分回到中间
        // 春分 -> 夏至：然后向西偏移，再向东偏移，到夏至最高
        // 夏至 -> 秋分：夏至最高，先向东偏移，再向西偏移，大约秋分回到中间
        // 秋分 -> 冬至：然后向西偏移，再向东偏移，到冬至最低
        const bias = offsetRatio > 0.25 && offsetRatio < 0.75 ? 1 : 2;
        this.orbitX = C_SKY_CENTER_X - Math.sin(2*offsetRatio*C_2PI) * C_MAX_MOVE_ON_X * bias;

        this.orbitY = C_SUN_MOON_ORBIT_BASE + Math.cos(Math.PI - C_2PI*sunriseSec/C_ONE_DAY_SECS) * C_SUN_ORBIT_RADIUS * C_ORBIT_SEASON_ADJUST;

        this.x = this.orbitX + this.posRadius * Math.cos(this.posAngle);
        this.y = this.orbitY + this.posRadius * Math.sin(this.posAngle);

        var colorWarmRatio = 0;
        const nowSec = dt.getHours()*3600 + dt.getMinutes()*60 + dt.getSeconds();
        if (nowSec < sunriseSec || nowSec > sunsetSec) {
            colorWarmRatio = 1;
        } else if (nowSec < sunriseSec + midSec) {
            colorWarmRatio = 1 - (nowSec - sunriseSec) / midSec;
        } else if (nowSec > sunsetSec - normalSec) {
            colorWarmRatio = 1 - (sunsetSec - nowSec) / normalSec;
        }
        this.color = arrToRGB([
            C_SUN_NORMAL_COLOR[0]*(1-colorWarmRatio) + C_SUN_WARM_COLOR[0]*colorWarmRatio,
            C_SUN_NORMAL_COLOR[1]*(1-colorWarmRatio) + C_SUN_WARM_COLOR[1]*colorWarmRatio,
            C_SUN_NORMAL_COLOR[2]*(1-colorWarmRatio) + C_SUN_WARM_COLOR[2]*colorWarmRatio]);
    }

    isVisible() {
        return this.x > -this.r*2 && this.x < C_WIDTH + this.r*2 && this.y > -this.r*2 && this.y < C_HEIGHT + this.r*2;
    }

    isEclips(moon) {
        if (!this.isVisible()) {
            return false;
        }
        const distToMoon = Math.sqrt(Math.pow(this.x - moon.x, 2) + Math.pow(this.y - moon.y, 2));
        return distToMoon < this.r + moon.r;
    }

    renderEclips(moon) {
        if (!this.isVisible() || !this.isEclips(moon)) {
            return;
        }

        const dist = Math.sqrt(Math.pow(this.x - moon.x, 2) + Math.pow(this.y - moon.y, 2));
        if (dist <= this.r - moon.r) {
            for(var ind in this.ctxList) {
                var ctx = this.ctxList[ind];
                ctx.beginPath();
                ctx.arc(moon.x, moon.y, moon.r, 0, 2 * Math.PI, false);
                ctx.shadowBlur = 5;
                ctx.shadowColor = "#101520";
                ctx.fillStyle = "#101520";
                ctx.fill();
            }
            return;
        }

        const sunPow2 = Math.pow(this.r, 2);
        const moonPow2 = Math.pow(moon.r, 2);
        const chordLen = Math.sqrt(sunPow2 - Math.pow((sunPow2 - moonPow2 + Math.pow(dist, 2))/2/dist, 2));
        const angleToCenterForSun = Math.atan2(moon.y - this.y, moon.x - this.x);
        const angleToEdgeForSun = Math.asin(chordLen / this.r);
        const angleStartForSun = angleToCenterForSun - angleToEdgeForSun;
        const angleEndForSun = angleToCenterForSun + angleToEdgeForSun;

        const startPointX = this.x + this.r * Math.cos(angleStartForSun);
        const startPointY = this.y + this.r * Math.sin(angleStartForSun);
        const endPointX = this.x + this.r * Math.cos(angleEndForSun);
        const endPointY = this.y + this.r * Math.sin(angleEndForSun);

        // compute the start angle for moon based on end points
        const angleStartForMoon = Math.atan2(startPointY - moon.y, startPointX - moon.x);
        const angleEndForMoon = Math.atan2(endPointY - moon.y, endPointX - moon.x);

        for(var ind in this.ctxList) {
            var ctx = this.ctxList[ind];
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, angleStartForSun, angleEndForSun, false);
            ctx.arc(moon.x, moon.y, moon.r, angleStartForMoon, angleEndForMoon, true);
            ctx.closePath();
            ctx.shadowBlur = 3;
            ctx.shadowColor = "#101520";
            ctx.fillStyle = "#101520";
            ctx.fill();
        }
    }
}

function createSun(ctxList) {
    var sun = new Sun(ctxList, 0, C_SUN_ORBIT_RADIUS, C_SUN_RADIUS,arrToRGB(C_SUN_NORMAL_COLOR));
    return sun;
}

/****************************************/
/*************** Moon *******************/
/****************************************/

const C_REF_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14));
const C_LUNAR_MONTH_MS = 29.53*C_ONE_DAY_MS;
const C_INITAL_ANGLE_FOR_NEW_MOON = 0.5*Math.PI;
const C_INITIAL_ROTATE_FOR_NEW_MOON = Math.PI; // 新月18点的时候的旋转角度是90度，那么0点的时候的旋转角度是90-270=-180度，等价于180度

const C_MOON_DAY_COLOR = [193, 208, 240];
const C_MOON_NIGHT_COLOR = [240, 240, 240];

class Moon {
    constructor(ctxList, posAngle, posRadius, r, color) {
        this.ctxList = ctxList;
        this.posAngle = posAngle;
        this.posRadius = posRadius;
        this.r = r;
        this.color = color;
        this.alpha = 1;
        this.phase = 0;
        this.rotate = 0;
        this.blurNormalRadius = 20;
        this.blurFactor = 1;
        this.orbitX = C_SKY_CENTER_X;
        this.orbitY = C_HEIGHT;
        this.x = C_SKY_CENTER_X + this.posRadius * Math.cos(this.posAngle);
        this.y = this.orbitY + this.posRadius * Math.sin(this.posAngle);
    }

    isVisible() {
        return this.x > -this.r*2 && this.x < C_WIDTH + this.r*2 && this.y > -this.r*2 && this.y < C_HEIGHT + this.r*2;
    }

    render() {
        if (!this.isVisible()) {
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
        const fillColor = arrToRGBA([this.color[0], this.color[1], this.color[2], this.alpha]);
        for (var ind in this.ctxList) {
            var ctx = this.ctxList[ind];
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, arcStart+this.rotate, arcEnd+this.rotate, false);
            ctx.ellipse(this.x, this.y, this.r*epllipseLongAxis, this.r, this.rotate, ellipseStart, ellipseEnd, ellipseCounterClockwise);
            ctx.closePath();

            ctx.shadowBlur = this.blurNormalRadius*this.blurFactor;
            ctx.shadowColor = fillColor;
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
    }

    update(nowAngleOffset, dt, sunriseSec, sunsetSec, normalSec, midSec) {
        const diffInMs = dt - C_REF_NEW_MOON;
        // lunar phase: 0.5 for full moon, 0/1 for new moon, 0~0.5 for waxing, 0.5~1 for waning
        this.phase = diffInMs % C_LUNAR_MONTH_MS / C_LUNAR_MONTH_MS;
        const phaseAngle = C_2PI * this.phase;
        const initialAngle = C_INITAL_ANGLE_FOR_NEW_MOON - phaseAngle;
        this.posAngle = nowAngleOffset + initialAngle;

        const initialRotate = C_INITIAL_ROTATE_FOR_NEW_MOON - phaseAngle;
        this.rotate = initialRotate + nowAngleOffset;

        this.updateColor(dt, sunriseSec, sunsetSec, normalSec, midSec);
        this.updateBlur(dt, sunriseSec, sunsetSec, normalSec);

        const bias = this.phase > 0.25 && this.phase < 0.75 ? 1 : 2;
        this.orbitX = C_SKY_CENTER_X + Math.sin(2*this.phase*C_2PI) * C_MAX_MOVE_ON_X * bias;

        this.orbitY = C_SUN_MOON_ORBIT_BASE - Math.cos(Math.PI - C_2PI*sunriseSec/C_ONE_DAY_SECS) * C_MOON_ORBIT_RADIUS * C_ORBIT_SEASON_ADJUST;

        this.x = this.orbitX + this.posRadius * Math.cos(this.posAngle);
        this.y = this.orbitY + this.posRadius * Math.sin(this.posAngle);

        if (dt.getHours() == 0) {
            console.log(dt, this.blurNormalRadius, this.phase, nowAngleOffset/C_2PI, this.posAngle/C_2PI*360%360, nowAngleOffset/C_2PI*360%360, initialAngle/C_2PI*360%360);
        }
    }

    updateColor(dt, sunriseSec, sunsetSec, normalSec, midSec) {
        if (!this.isVisible()) {
            return;
        }
        const nowSec = dt.getHours()*3600 + dt.getMinutes()*60 + dt.getSeconds();
        if (nowSec < sunriseSec + midSec) {
            this.color =C_MOON_NIGHT_COLOR;
        } else if (nowSec < sunriseSec + normalSec) {
            const ratio = (nowSec - sunriseSec - midSec) / midSec;
            const redColor = C_MOON_NIGHT_COLOR[0] + (C_MOON_DAY_COLOR[0] - C_MOON_NIGHT_COLOR[0]) * ratio;
            const greenColor = C_MOON_NIGHT_COLOR[1] + (C_MOON_DAY_COLOR[1] - C_MOON_NIGHT_COLOR[1]) * ratio;
            const blueColor = C_MOON_NIGHT_COLOR[2] + (C_MOON_DAY_COLOR[2] - C_MOON_NIGHT_COLOR[2]) * ratio;
            this.color = [redColor, greenColor, blueColor];
        } else if (nowSec < sunsetSec - midSec - 2*normalSec) {
            this.color = C_MOON_DAY_COLOR;
        } else if (nowSec < sunsetSec - midSec) {
            const ratio = (nowSec - sunsetSec + midSec + 2*normalSec) / normalSec / 2;
            const redColor = C_MOON_DAY_COLOR[0] + (C_MOON_NIGHT_COLOR[0] - C_MOON_DAY_COLOR[0]) * ratio;
            const greenColor = C_MOON_DAY_COLOR[1] + (C_MOON_NIGHT_COLOR[1] - C_MOON_DAY_COLOR[1]) * ratio;
            const blueColor = C_MOON_DAY_COLOR[2] + (C_MOON_NIGHT_COLOR[2] - C_MOON_DAY_COLOR[2]) * ratio;
            this.color = [redColor, greenColor, blueColor];
        } else {
            this.color = C_MOON_NIGHT_COLOR;
        }
    }

    updateBlur(dt, sunriseSec, sunsetSec, normalSec) {
        if (!this.isVisible()) {
            return;
        }
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

    updateAlphaAccordingToSun(sun) {
        this.alpha = 1;
        if (!sun.isVisible()) {
            return;
        }
        if (!this.isVisible()) {
            return;
        }
        const invisibleDist = sun.r + 2*this.r;
        const invisibleBeginDist = 3*this.r;
        this.alpha = alphaAccordingToOther(this.x, this.y, sun.x, sun.y, invisibleDist, invisibleBeginDist);
    }
}

function createMoon(ctxList, offset, nowSec) {
    var moon = new Moon(ctxList, 0, C_MOON_ORBIT_RADIUS, C_MOON_RADIUS, "#f0f0f0");
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
    moon.update(vars.globalNowAngleOffset, new Date(vars.globalNowSec*1000), vars.sunriseSec, vars.sunsetSec, vars.normalToChangeInSecs, vars.midToChangeInSecs);

    context.clearRect(0, 0, C_WIDTH, C_HEIGHT);
    for (var i = 0; i < stars.length; i++) {
        const distToMoon = Math.sqrt(Math.pow(stars[i].x - moon.x, 2) + Math.pow(stars[i].y - moon.y, 2));
        if (distToMoon < moon.r + stars[i].r) {
            continue;
        }
        stars[i].render();
    }
    moon.render();
    requestAnimationFrame(animateSkyObjects.bind(null, sun, moon, stars, varsGetter));
}

function animateSkyObjectsV5(sun, moon, stars, varsGetter) {
    var vars = varsGetter();
    // vars.globalNowAngleOffset = 0;

    sun.update(vars.globalNowAngleOffset, new Date(vars.globalNowSec*1000), vars.sunriseSec,
        vars.sunsetSec, vars.normalToChangeInSecs, vars.midToChangeInSecs);

    moon.update(vars.globalNowAngleOffset, new Date(vars.globalNowSec*1000), vars.sunriseSec,
        vars.sunsetSec, vars.normalToChangeInSecs, vars.midToChangeInSecs);
    moon.updateAlphaAccordingToSun(sun);

    for (var i = 0; i < stars.length; i++) {
        stars[i].update(vars.globalNowAngleOffset);
        stars[i].updateAlphaAccordingTo(sun, moon);
    }

    context.clearRect(0, 0, C_WIDTH, C_HEIGHT);
    for (var i = 0; i < stars.length; i++) {
        stars[i].render();
    }
    sun.render();
    if (sun.isEclips(moon)) {
        sun.renderEclips(moon);
    } else {
        moon.render();
    }
    requestAnimationFrame(animateSkyObjectsV5.bind(null, sun, moon, stars, varsGetter));
}
