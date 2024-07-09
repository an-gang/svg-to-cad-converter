$(document).ready(function () {
    $("#confirm").click(function () {
        var sourceInputted = $("#source")[0];
        if (sourceInputted.files.length === 0) {
            alert("请选择html图纸文件！");
            return;
        }
        var sourceFile = sourceInputted.files[0];
        var fileReader = new FileReader();
        fileReader.readAsText(sourceFile);
        fileReader.onload = function () {
            var rawStr = this.result;
            var svgStr = rawStr.substring(rawStr.indexOf("<svg"), rawStr.lastIndexOf("</svg>") + 6);
            $("#temp").html(svgStr);
            $("#output").val(main());
        }
    });
    $("#copy").click(function () {
        var output = $("#output");
        if (output.val() === "") {
            alert("无内容！");
            return;
        }
        output.select();
        document.execCommand("copy");
        alert("已复制到剪切板");
    });

    function main() {
        var header =
            "$HEADER\n" +
            "GENCAD 1.4\n" +
            "USER \"MENTOR GRAPHICS - TRANSLATOR CAMCAD Professional 4.14.312.6 - Licensed\"\n" +
            "DRAWING Board_0_0\n" +
            "REVISION \"\"\n" +
            "UNITS USER 1000\n" +
            "ORIGIN 0 0\n" +
            "INTERTRACK 0\n" +
            "$ENDHEADER\n\n";
        var shapes = "";
        var components = "";
        var devices = "";
        var signals = "";

        var deviceIndex = 0;
        var polygonList = [];
        var signalMap = new Map();

        $("polygon").each(function () {
            //计算元件中心点
            var points = $(this).attr("points").split(" ");
            var topLeft = points[0].split(",");
            var bottomRight = points[2].split(",");
            var centerX = parseFloat(topLeft[0]) + (parseFloat(bottomRight[0]) - parseFloat(topLeft[0])) / 2;
            var centerY = parseFloat(topLeft[1]) + (parseFloat(bottomRight[1]) - parseFloat(topLeft[1])) / 2;
            var polygonName = $(this).attr("refdes");


            if (polygonList.includes(polygonName)) {
                if ($(this).parent().attr("class").indexOf("TOP") !== -1) {
                    polygonName += "_TOP";
                } else {
                    polygonName += "_BOTTOM";
                }
            } else {
                polygonList.push(polygonName);
            }
            //生成SHAPES部分
            shapes += "INSERT SMD\n";
            shapes += "SHAPE " + polygonName + "\n";
            $(this).parent().find("circle").each(function () {
                var offsetX = parseFloat($(this).attr("cx")) - centerX;
                var offsetY = parseFloat($(this).attr("cy")) - centerY;
                shapes += "PIN " + $(this).attr("number") + "  X " + offsetY.toFixed(2) + " " + offsetX.toFixed(2) + " TOP 0.00 0\n";
                if (signalMap.get($(this).attr("net")) === undefined) {
                    signalMap.set($(this).attr("net"), [polygonName + " " + $(this).attr("number")]);
                } else {
                    signalMap.get($(this).attr("net")).push(polygonName + " " + $(this).attr("number"))
                }
            });
            //生成COMPONENTS部分
            components += "COMPONENT " + polygonName + "\n";
            components += "PLACE " + -centerY.toFixed(2) + " " + centerX.toFixed(2) + "\n";//y轴坐标取反修复翻转
            if ($(this).parent().attr("class").indexOf("TOP") !== -1) {
                components += "LAYER TOP\n";
            } else {
                components += "LAYER BOTTOM\n";
            }
            components += "ROTATION 0\n";
            components += "SHAPE " + polygonName + " 0 0\n";
            components += "DEVICE Device" + deviceIndex + "\n";
            //生成DEVICES部分
            var bom = $(this).parent().attr("bom").replace(/\n/g, "");
            if (bom.indexOf("[DESCRIPTION]：") !== -1) {
                bom = bom.substring(bom.indexOf("[DESCRIPTION]：") + 14);
                if (bom.indexOf("[") !== -1) {
                    bom = bom.substring(0, bom.indexOf("["));
                }
            }
            devices += "DEVICE Device" + deviceIndex + "\n";
            devices += "PART " + bom + "\n";
            deviceIndex++;
        });
        //生成SIGNALS部分
        for (var entry of signalMap) {
            signals += "SIGNAL " + entry[0] + "\n";
            for (var i = 0; i < entry[1].length; i++) {
                signals += "NODE " + entry[1][i] + "\n";
            }
        }
        shapes = "$SHAPES\n" + shapes + "$ENDSHAPES\n\n";
        components = "$COMPONENTS\n" + components + "$ENDCOMPONENTS\n\n";
        devices = "$DEVICES\n" + devices + "$ENDDEVICES\n\n";
        signals = "$SIGNALS\n" + signals + "$ENDSIGNALS\n\n";
        return header + shapes + components + devices + signals;
    }
});