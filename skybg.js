
var night = [[12, 20, 50], [12, 20, 50], [12, 20, 50], [12, 20, 50], [12, 20, 50], [12, 20, 50]];
var night_dawn = [[73, 91, 114], [85, 101, 124], [99, 115, 130], [117, 129, 139], [140, 142, 139], [159, 139, 115]];
var dawn = [[134, 145, 160], [195, 194, 180], [245, 223, 177], [249, 212, 143], [244, 178, 109], [239, 127, 75]];
var dawn_day = [[143, 161, 184], [155, 171, 194], [169, 185, 200], [187, 199, 209], [210, 212, 209], [229, 209, 185]];
var day = [[78, 120, 196], [78, 120, 196], [78, 120, 196], [78, 120, 196], [78, 120, 196], [78, 120, 196]];
var day_dusk = [[103, 121, 144], [115, 131, 154], [129, 145, 160], [147, 159, 169], [170, 172, 169], [189, 169, 145]];
var dusk = [[134, 145, 160], [195, 194, 180], [245, 223, 177], [249, 212, 143], [244, 178, 109], [239, 127, 75]];
var dusk_night = [[8, 28, 65], [31, 51, 114], [50, 73, 146], [115, 123, 196], [172, 161, 201], [204, 189, 198]];


function BackgroundConfig(secs, rgbList, gradientPointList) {
    this.secs = secs;
    this.rgbList = rgbList;
    this.gradientPointList = gradientPointList; // 长度必须是 rgbList.length - 2
}

var backgroundConfigs = [];
function resetBgConf(sunriseSecond, sunsetSecond, normalToChange, midToChange) {
    backgroundConfigs = [
        new BackgroundConfig(0, night, [20, 40, 60, 80]),

        new BackgroundConfig(sunriseSecond - normalToChange, night, [20, 40, 90, 95]),
        new BackgroundConfig(sunriseSecond - midToChange, night_dawn, [28, 45, 86, 92]),
        new BackgroundConfig(sunriseSecond, dawn, [46, 72, 86, 92]),
        new BackgroundConfig(sunriseSecond + midToChange, dawn_day, [20, 72, 86, 92]),
        new BackgroundConfig(sunriseSecond + normalToChange, day, [20, 72, 80, 87]),

        new BackgroundConfig(sunsetSecond - normalToChange, day, [20, 40, 60, 80]),
        new BackgroundConfig(sunsetSecond - midToChange, day_dusk, [20, 40, 60, 80]),
        new BackgroundConfig(sunsetSecond, dusk, [46, 72, 86, 92]),
        new BackgroundConfig(sunsetSecond + midToChange, dusk_night, [28, 72, 86, 92]),
        new BackgroundConfig(sunsetSecond + normalToChange, night, [28, 72, 90, 96]),

        new BackgroundConfig(24 * 3600, night, [20, 40, 60, 80]),
    ];
}

function computeBackgroundV2(config1, config2, curSecs) {
    var point = (curSecs * 1.0 - config1.secs) / (config2.secs * 1.0 - config1.secs);
    var grad1 = config1.rgbList;
    var grad2 = config2.rgbList;
    var gradPt1 = config1.gradientPointList;
    var gradPt2 = config2.gradientPointList;
    var bg = "linear-gradient(to bottom, ";
    for (var i = 0; i < grad1.length; i++) {
        var red = Math.floor(grad1[i][0] + (grad2[i][0] - grad1[i][0]) * point);
        var green = Math.floor(grad1[i][1] + (grad2[i][1] - grad1[i][1]) * point);
        var blue = Math.floor(grad1[i][2] + (grad2[i][2] - grad1[i][2]) * point);
        bg += "rgb(" + red + ", " + green + ", " + blue + ")";
        if (i > 0 && i < grad1.length - 1) {
            bg += " " + Math.floor(gradPt1[i - 1] + (gradPt2[i - 1] - gradPt1[i - 1]) * point) + "%";
        }
        if (i < grad1.length - 1) {
            bg += ", ";
        }
    }
    bg += ")";
    return bg
}

function doChangeBackgroundV2(now, debug) {
    var curSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    var config1 = backgroundConfigs[0];
    var config2 = backgroundConfigs[1];
    for (var i = 1; i < backgroundConfigs.length - 1; i++) {
        if (curSecs >= backgroundConfigs[i].secs) {
            config1 = backgroundConfigs[i];
            config2 = backgroundConfigs[i + 1];
        } else {
            break;
        }
    }
    var bg = computeBackgroundV2(config1, config2, curSecs);
    if (debug) {
        // console.log(now, bg);
    }

    canvas.style.background = bg;
}
