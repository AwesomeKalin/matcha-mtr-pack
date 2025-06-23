importPackage(java.awt);

include("font_util.js");
include("js_util.js");

const SCREEN_COMING_NEXT = "coming_next";
const SCREEN_FULL_ROUTE_MAP = "full_route_map";

const THIS_ROUTE_NAME_HEIGHT = 72;
const RIGHT_PART_INTERCHANGE_ROUTE_NAME_HEIGHT = 32;
const HORIZONTAL_SPACING = 15;
const VERTICAL_SPACING = 5;
const ROUTE_BAR_WIDTH = 10;
const ARROW_WIDTH = 30;

var WIDTH;
var HEIGHT;
var LEFT_WIDTH;
var RIGHT_WIDTH;
var START_X;
var START_Y;

const AUTHOR = "Code by Jeffreyg1228 & Design by Lyt";
const LCD_VERSION = "V2024.5";

const ROBOTO_REGULAR = Resources.readFont(Resources.idr("fonts/roboto/roboto-regular.ttf"));
const ROBOTO_BOLD = Resources.readFont(Resources.idr("fonts/roboto/roboto-bold.ttf"));
const SOURCE_HAN_SANS_CN_REGULAR = Resources.readFont(Resources.idr("fonts/source-han-sans-cn/source-han-sans-cn-regular.otf"));
const SOURCE_HAN_SANS_CN_BOLD = Resources.readFont(Resources.idr("fonts/source-han-sans-cn/source-han-sans-cn-bold.otf"));

function drawScreen(width, height, g, routeInfo, doorOpenInfo, nextStationIndex, trainStatus, leftPartUseCjk, rightPartFullRouteMapUseCjk, rightPartScreenType, rightDoor, manualAllowed, isCurrentlyManual) {
    WIDTH = width;
    HEIGHT = height;
    LEFT_WIDTH = WIDTH / 3;
    RIGHT_WIDTH = WIDTH - LEFT_WIDTH - ROUTE_BAR_WIDTH;
    START_X = LEFT_WIDTH / 20;
    START_Y = HEIGHT / 10;
    
    // 清屏
    g.setColor(Color.WHITE);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    // 绘制 LCD 作者和版本
    let font = ROBOTO_REGULAR.deriveFont(12.0);
    let fm = g.getFontMetrics(font);
    g.setColor(Color.GRAY);
    g.setFont(font);
    g.drawString(AUTHOR, WIDTH - fm.stringWidth(AUTHOR) - 10, HEIGHT - 2 * fm.getHeight());
    g.drawString(LCD_VERSION, WIDTH - fm.stringWidth(LCD_VERSION) - 10, HEIGHT - fm.getHeight());

    if (trainStatus == STATUS_NO_ROUTE || routeInfo == null) {
        drawBlueScreen(g, NO_ROUTE_TIP);
        return;
    }

    // 路线色条
    g.setColor(routeInfo.routeColor);
    g.fillRect(LEFT_WIDTH, 0, ROUTE_BAR_WIDTH, HEIGHT);

    // 绘制左屏
    let nextStationIndex2 = trainStatus == STATUS_ARRIVED ? nextStationIndex + 1 : nextStationIndex;
    let depotName = CONFIG.showDepotName ? routeInfo.depotName : DEFAULT_DEPOT_NAME;
    if (nextStationIndex2 >= routeInfo.stationInfoList.length && routeInfo.nextRouteInfo != null) { // 列车已到达本线路终点站且存在下个路线，此时左屏应绘制下一路线信息
        let showCjk = !TextUtil.getCjkParts(routeInfo.nextRouteInfo.routeName).isEmpty();
        let showNonCjk = !TextUtil.getNonCjkParts(routeInfo.nextRouteInfo.routeName).isEmpty();
        leftPartUseCjk = showCjk && showNonCjk ? leftPartUseCjk : !showCjk ? false : !showNonCjk ? true : false;

        let routeNumber = TextUtil.getExtraParts(routeInfo.nextRouteInfo.routeName).replaceAll(".*\\{([^}]*)}.*", "$1");
        let routeName = (routeNumber == "" || routeNumber == TextUtil.getExtraParts(routeInfo.nextRouteInfo.routeName)) ? getMatching(routeInfo.nextRouteInfo.routeName, leftPartUseCjk) : routeNumber;
        
        drawLeftPart(g, leftPartUseCjk, routeName, routeInfo.nextRouteInfo.routeColor, routeInfo.nextRouteInfo.destination, routeInfo.nextRouteInfo.firstStation, false, depotName, routeInfo.nextRouteInfo.circularState, nextStationIndex2, trainStatus, routeInfo.stationInfoList, manualAllowed, isCurrentlyManual);
    } else { // 左屏绘制本线信息
        let showCjk = !TextUtil.getCjkParts(routeInfo.routeName).isEmpty(); // showCjk 决定右屏同时显示中英文的“即将到达”“已到达”屏幕是否显示中文
        let showNonCjk = !TextUtil.getNonCjkParts(routeInfo.routeName).isEmpty();
        leftPartUseCjk = showCjk && showNonCjk ? leftPartUseCjk : !showCjk ? false : !showNonCjk ? true : false; // 若 showCjk, showNonCjk 都为 true，则 leftPartUseCjk 不变；若 showCjk 为 false，则始终为 false；若 showNonCjk 为 false，则始终为 true；若 showCjk, showNonCjk 都为 false，则始终为 false。

        let routeNumber = TextUtil.getExtraParts(routeInfo.routeName).replaceAll(".*\\{([^}]*)}.*", "$1"); // 表示 routeName “||” 后的 “{}”中内容；如果不含“{}”，则为 TextUtil.getExtraParts(routeInfo.routeName) 的值；如果不含“||”，则为空值
        let routeName = (routeNumber == "" || routeNumber == TextUtil.getExtraParts(routeInfo.routeName)) ? getMatching(routeInfo.routeName, leftPartUseCjk) : routeNumber;
        let returningToDepot = nextStationIndex2 >= routeInfo.stationInfoList.length && routeInfo.nextRouteInfo == null || trainStatus == STATUS_RETURNING_TO_DEPOT; // 停靠在所有线路的终点站，即将返回车厂（此时 trainStatus 为 STATUS_ARRIVED 而非 STATUS_RETURNING_TO_DEPOT）或者正在返回车厂途中（此时 trainStatus 为 STATUS_RETURNING_TO_DEPOT）
        
        drawLeftPart(g, leftPartUseCjk, routeName, routeInfo.routeColor, routeInfo.destination, null, returningToDepot, depotName, routeInfo.circularState, nextStationIndex2, trainStatus, routeInfo.stationInfoList, manualAllowed, isCurrentlyManual);
    }
    
    // 根据列车状态绘制右屏内容
    let showCjk = !TextUtil.getCjkParts(routeInfo.routeName).isEmpty(); // showCjk 决定右屏同时显示中英文的“即将到达”“已到达”屏幕是否显示中文
    let showNonCjk = !TextUtil.getNonCjkParts(routeInfo.routeName).isEmpty();
    rightPartFullRouteMapUseCjk = showCjk && showNonCjk ? rightPartFullRouteMapUseCjk : !showCjk ? false : !showNonCjk ? true : false; // 若 showCjk, showNonCjk 都为 true，则 rightPartFullRouteMapUseCjk 不变；若 showCjk 为 false，则始终为 false；若 showNonCjk 为 false，则始终为 true；若 showCjk, showNonCjk 都为 false，则始终为 false。
    
    let lastRouteDestination = routeInfo.lastRouteDestination == null ? { stationName: depotName, interchangeInfo: [] } : routeInfo.lastRouteDestination;
    if (trainStatus == STATUS_ARRIVED) {
        drawRightPartThisStation(g, showCjk, routeInfo.routeColor, routeInfo.stationInfoList[nextStationIndex], rightDoor, doorOpenInfo);
    } else if (trainStatus == STATUS_WAITING_FOR_DEPARTURE) {
        drawRightPartFullRouteMap(g, rightPartFullRouteMapUseCjk, rightDoor, routeInfo.routeColor, nextStationIndex, routeInfo.stationInfoList);
    } else if (trainStatus == STATUS_RETURNING_TO_DEPOT) {
        drawRightPartComingNextScreen(g, routeInfo.routeColor, showCjk, lastRouteDestination, nextStationIndex, routeInfo.stationInfoList);
    } else {
        if (rightPartScreenType == SCREEN_COMING_NEXT) {
            drawRightPartComingNextScreen(g, routeInfo.routeColor, showCjk, lastRouteDestination, nextStationIndex, routeInfo.stationInfoList);
        } else if (rightPartScreenType == SCREEN_FULL_ROUTE_MAP) {
            drawRightPartFullRouteMap(g, rightPartFullRouteMapUseCjk, rightDoor, routeInfo.routeColor, nextStationIndex, routeInfo.stationInfoList);
        }
    }
}

function drawLeftPart(g, useCjk, routeName, routeColor, destination, nextRouteFirstStation, returningToDepot, depotName, circularState, nextStationIndex, trainStatus, stationInfoList, manualAllowed, isCurrentlyManual) {
    g.setColor(routeColor);
    g.fillRect(0, 0, LEFT_WIDTH, HEIGHT);
    g.setColor(new Color(getRGBAValue(0, 0, 0, 128), true));
    g.fillRect(0, 0, LEFT_WIDTH, HEIGHT);

    let font;
    let fm;
    let x = START_X;
    let y = START_Y;

    // 绘制当前路线名称
    let width = drawRouteName(g, START_X, START_Y, LEFT_WIDTH / 2, THIS_ROUTE_NAME_HEIGHT, LEFT_WIDTH, routeName, routeColor, false, false, false, Color.WHITE);

    // 绘制手动驾驶信息（如果有）和“开往”/“环线”字符
    font = (useCjk ? SOURCE_HAN_SANS_CN_REGULAR : ROBOTO_REGULAR).deriveFont(useCjk ? 20.0 : 24.0);
    fm = g.getFontMetrics(font);
    x += width + HORIZONTAL_SPACING;
    let strToDraw = getMatching(circularState == "NONE" ? BOUND_FOR : LOOP, useCjk); // “开往”/“环线”字符
    if (CONFIG.showManualStatus && manualAllowed) {
        x += drawRouteName(g, x, y, LEFT_WIDTH - x - fm.stringWidth(strToDraw), fm.getHeight(), LEFT_WIDTH, isCurrentlyManual ? getMatching(CURRENTLY_MANUAL, useCjk) : getMatching(MANUAL_ALLOWED, useCjk), Color.LIGHT_GRAY, false, false, !isCurrentlyManual, Color.LIGHT_GRAY) + VERTICAL_SPACING; // 绘制手动驾驶信息
    }
    y += fm.getAscent();
    g.setColor(Color.LIGHT_GRAY);
    g.setFont(font);
    g.drawString(strToDraw, x, y);

    // 绘制终点站（或车厂）名称/“内环”（顺时针循环线）/“外环”（逆时针循环线）
    let destinationNameToDraw = getMatching(returningToDepot ? depotName : circularState == "NONE" ? destination : circularState == "CLOCKWISE" ? CLOCKWISE : ANTICLOCKWISE, useCjk);
    if (useCjk && destinationNameToDraw.length() > 8 || !useCjk && destinationNameToDraw.length() > 14) {
        font = (useCjk ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD).deriveFont(useCjk ? 28.0 : 36.0);
    } else {
        font = (useCjk ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD).deriveFont(36.0);
    }
    fm = g.getFontMetrics(font);
    x = START_X + width + HORIZONTAL_SPACING;
    if (useCjk || destinationNameToDraw.length() > 14) {
        y += fm.getAscent();
    } else {
        y = START_Y + THIS_ROUTE_NAME_HEIGHT - fm.getDescent();
    }
    g.setColor(Color.WHITE);
    g.setFont(font);
    y += drawLongText(g, destinationNameToDraw, x, y, LEFT_WIDTH - x - HORIZONTAL_SPACING);

    // 绘制“下一站”/“列车状态”/“温馨提示”字样
    font = (useCjk ? SOURCE_HAN_SANS_CN_REGULAR : ROBOTO_REGULAR).deriveFont(28.0);
    fm = g.getFontMetrics(font);
    x = START_X;
    y += VERTICAL_SPACING + fm.getAscent();
    g.setColor(Color.LIGHT_GRAY);
    g.setFont(font);
    if (returningToDepot) {
        strToDraw = getMatching(WARM_TIP, useCjk);
    } else if (trainStatus == STATUS_ON_ROUTE || trainStatus == STATUS_ARRIVED) {
        strToDraw = getMatching(NEXT_STATION, useCjk);
    } else {
        strToDraw = getMatching(CURRENT_STATUS, useCjk);
    }
    g.drawString(strToDraw, x, y);

    if (trainStatus == STATUS_ON_ROUTE || trainStatus == STATUS_ARRIVED) {
        let interchangeRoutesToDraw = nextStationIndex < stationInfoList.length ? stationInfoList[nextStationIndex].interchangeInfo : nextRouteFirstStation == null ? null : nextRouteFirstStation.interchangeInfo;
        if (interchangeRoutesToDraw != null && interchangeRoutesToDraw.length > 0) {
            // 绘制“换乘”字样
            width = fm.stringWidth(strToDraw);
            font = (useCjk ? SOURCE_HAN_SANS_CN_REGULAR : ROBOTO_REGULAR).deriveFont(28.0);
            fm = g.getFontMetrics(font);
            x += width + HORIZONTAL_SPACING;
            g.setColor(Color.WHITE);
            g.setFont(font);
            strToDraw = getMatching(TRANSFER, useCjk);
            g.drawString(strToDraw, x, y);

            // 绘制换乘信息
            width = fm.stringWidth(strToDraw);
            x += width + 10;
            const etCeteraWidth = g.getFontMetrics((useCjk ? SOURCE_HAN_SANS_CN_REGULAR : ROBOTO_REGULAR).deriveFont(28.0)).stringWidth(getMatching(ET_CETERA, useCjk));
            for (let interchangeRoute of interchangeRoutesToDraw) {
                if (interchangeRoute != null) {
                    width = drawRouteName(g, x, useCjk ? y - fm.getAscent() * 4 / 5 : y - fm.getAscent(), 0, useCjk ? (fm.getAscent() + fm.getDescent()) * 4 / 5 : fm.getAscent() + fm.getDescent(), LEFT_WIDTH - etCeteraWidth, getMatching(interchangeRoute.name, useCjk), interchangeRoute.color, false, false, interchangeRoute.isConnectingStation, Color.WHITE);
                    if (width == 0) {
                        // 绘制“等”字符
                        font = (useCjk ? SOURCE_HAN_SANS_CN_REGULAR : ROBOTO_REGULAR).deriveFont(28.0);
                        g.setFont(font);
                        g.setColor(Color.WHITE);
                        g.drawString(getMatching(ET_CETERA, useCjk), x, y);
                        break;
                    }
                    x += width + 10;
                }
            }
        }
    }

    // 绘制下一站名称/列车状态
    if (returningToDepot) {
        strToDraw = getMatching(RETURNING_TO_DEPOT_TIP, useCjk);
    } else if (nextStationIndex >= stationInfoList.length) {
        strToDraw = getMatching(nextRouteFirstStation.stationName, useCjk);
    } else if (trainStatus == STATUS_ON_ROUTE || trainStatus == STATUS_ARRIVED) {
        strToDraw = getMatching(stationInfoList[nextStationIndex].stationName, useCjk);
    } else if (trainStatus == STATUS_WAITING_FOR_DEPARTURE) {
        strToDraw = getMatching(WAITING_FOR_DEPARTURE, useCjk);
    } else if (trainStatus == STATUS_LEAVING_DEPOT) {
        strToDraw = getMatching(LEAVING_DEPOT, useCjk);
    } else if (trainStatus == STATUS_CHANGING_ROUTE) {
        strToDraw = getMatching(CHANGING_ROUTE, useCjk);
    }
    if (useCjk && strToDraw.length() > 8 || !useCjk && strToDraw.length() > 14) {
        font = (useCjk ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD).deriveFont(useCjk ? 42.0 : 48.0);
    } else {
        font = (useCjk ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD).deriveFont(useCjk ? 62.0 : 56.0);
    }
    fm = g.getFontMetrics(font);
    x = START_X;
    y += VERTICAL_SPACING + fm.getAscent();
    g.setColor(Color.WHITE);
    g.setFont(font);
    drawLongText(g, strToDraw, x, y, LEFT_WIDTH - x - HORIZONTAL_SPACING);
}

function drawRightPartThisStation(g, showCjk, routeColor, thisStation, rightDoor, doorOpenInfo) {
    if (thisStation.reverseAtPlatform) {
        rightDoor = !rightDoor;
    }

    let font;
    let fm;
    const startX = LEFT_WIDTH + ROUTE_BAR_WIDTH + HORIZONTAL_SPACING * 2;
    const startY = START_Y / 4;
    let x = startX;
    let y = startY;

    // 绘制“已到达” CJK
    g.setColor(Color.DARK_GRAY);
    if (showCjk) {
        font = SOURCE_HAN_SANS_CN_REGULAR.deriveFont(28.0);
        fm = g.getFontMetrics(font);
        y += fm.getAscent();
        g.setFont(font);
        g.drawString(getMatching(THIS_STATION, true), x, y);

        // 绘制“已到达”非 CJK
        y += fm.getDescent();
    }

    // 绘制“已到达”非 CJK
    font = ROBOTO_REGULAR.deriveFont(24.0);
    fm = g.getFontMetrics(font);
    g.setFont(font);
    y += fm.getAscent();
    g.drawString(getMatching(THIS_STATION, false), x, y);

    // 绘制 CJK 当前站名（站名只含非 CJK 时，则绘制非 CJK 当前站名）
    const hasCjk = !TextUtil.getCjkParts(thisStation.stationName).isEmpty();
    y = startY;
    let strToDraw = getMatching(thisStation.stationName, hasCjk);
    font = (hasCjk ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD).deriveFont(48.0);
    fm = g.getFontMetrics(font);
    g.setFont(font);
    g.setColor(Color.BLACK);
    x = startX + (RIGHT_WIDTH - HORIZONTAL_SPACING * 4 - fm.stringWidth(getMatching(thisStation.stationName, true))) / 2;
    y += fm.getAscent();
    g.drawString(strToDraw, x, y);
    y += fm.getDescent();

    // 站名同时含 CJK 和非 CJK 时，绘制非 CJK 当前站名
    strToDraw = TextUtil.getNonCjkParts(thisStation.stationName);
    if (hasCjk && !strToDraw.isEmpty()) {
        font = ROBOTO_BOLD.deriveFont(34.0);
        fm = g.getFontMetrics(font);
        g.setFont(font);
        g.setColor(Color.GRAY);
        x = startX + (RIGHT_WIDTH - HORIZONTAL_SPACING * 4 - fm.stringWidth(getMatching(thisStation.stationName, false))) / 2;
        y += fm.getAscent();
        g.drawString(strToDraw, x, y);
    }

    y += VERTICAL_SPACING * 3;
    const width = (RIGHT_WIDTH - HORIZONTAL_SPACING * 4) / 2; // 梯形的长
    const height = 22; // 梯形的高
    // 绘制梯形左端
    x = startX;
    y += height;
    let xPoints = rightDoor ? [x + 15, x, x + width, x + width] : [x, x, x + width, x + width];
    let yPoints = [y - height, y, y, y - height];
    g.setColor(rightDoor ? routeColor : Color.LIGHT_GRAY);
    g.fillPolygon(xPoints, yPoints, 4);
    // 绘制梯形右端
    x += width;
    xPoints = rightDoor ? [x, x, x + width, x + width] : [x, x, x + 15 + width, x + width];
    g.setColor(rightDoor ? Color.LIGHT_GRAY : routeColor);
    g.fillPolygon(xPoints, yPoints, 4);

    if (thisStation.interchangeInfo != null && thisStation.interchangeInfo.length > 0) {
        x = startX;
        y += VERTICAL_SPACING * 3 + RIGHT_PART_INTERCHANGE_ROUTE_NAME_HEIGHT;
        let descent = 0;
        // 绘制“换乘”字样 CJK
        g.setColor(Color.BLACK);
        if (showCjk) {
            font = SOURCE_HAN_SANS_CN_REGULAR.deriveFont(24.0);
            fm = g.getFontMetrics(font);
            g.setFont(font);
            strToDraw = getMatching(TRANSFER, true);
            descent = fm.getDescent();
            g.drawString(strToDraw, x, y - descent);
            x += fm.stringWidth(strToDraw) + 5;
        }

        // 绘制“换乘”字样非 CJK
        font = ROBOTO_REGULAR.deriveFont(22.0);
        fm = g.getFontMetrics(font);
        g.setFont(font);
        strToDraw = getMatching(TRANSFER, false);
        g.drawString(strToDraw, x, y - (descent == 0 ? fm.getDescent() : descent));
        x += fm.stringWidth(strToDraw) + 10;

        // 绘制换乘信息
        const etCeteraWidth = g.getFontMetrics(SOURCE_HAN_SANS_CN_REGULAR.deriveFont(24.0)).stringWidth(getMatching(ET_CETERA, true)) + 5 + g.getFontMetrics(ROBOTO_REGULAR.deriveFont(22.0)).stringWidth(getMatching(ET_CETERA, false));
        for (let interchangeRoute of thisStation.interchangeInfo) {
            if (interchangeRoute != null) {
                let routeNameWidth = drawRouteName(g, x, y - RIGHT_PART_INTERCHANGE_ROUTE_NAME_HEIGHT, 0, RIGHT_PART_INTERCHANGE_ROUTE_NAME_HEIGHT, WIDTH - HORIZONTAL_SPACING * 2 - etCeteraWidth, formatName(interchangeRoute.name), interchangeRoute.color, false, false, interchangeRoute.isConnectingStation, Color.BLACK);
                if (routeNameWidth == 0) {
                    // 绘制“等”字符 CJK
                    g.setColor(Color.BLACK);
                    if (showCjk) {
                        font = SOURCE_HAN_SANS_CN_REGULAR.deriveFont(24.0);
                        fm = g.getFontMetrics(font);
                        g.setFont(font);
                        g.drawString(getMatching(ET_CETERA, true), x, y - descent);
                        x += fm.stringWidth(getMatching(ET_CETERA, true)) + 5;
                    }
                    // 绘制“等”字符非 CJK
                    font = ROBOTO_REGULAR.deriveFont(22.0);
                    fm = g.getFontMetrics(font);
                    g.setFont(font);
                    g.drawString(getMatching(ET_CETERA, false), x, y - (descent == 0 ? fm.getDescent() : descent));
                    break;
                }
                x += routeNameWidth + 10;
            }
        }
    }

    if (CONFIG.showDoorOpenInfo && doorOpenInfo != null && doorOpenInfo.length > 0) {
        let cjkToDraw = getMatching(DOOR_OPEN_INFO, true);
        let nonCjkToDraw = getMatching(DOOR_OPEN_INFO, false);
        for (let i = 0; i < doorOpenInfo.length; i += 2) {
            let carIndex = doorOpenInfo[i];
            let leftOrRight = doorOpenInfo[i + 1]; // 左门为 false，右门为 true
            cjkToDraw += (carIndex + 1) + "(" + (leftOrRight ? "右" : "左") + "), ";
            nonCjkToDraw += (carIndex + 1) + "(" + (leftOrRight ? "Right" : "Left") + "), ";
        }
        x = startX;
        y += VERTICAL_SPACING;
        cjkToDraw = cjkToDraw.substring(0, cjkToDraw.length - 2) + "。";
        nonCjkToDraw = nonCjkToDraw.substring(0, nonCjkToDraw.length - 2) + ".";

        // 绘制开门侧提示 CJK
        g.setColor(Color.RED);
        if (showCjk) {
            font = SOURCE_HAN_SANS_CN_REGULAR.deriveFont(24.0);
            fm = g.getFontMetrics(font);
            g.setFont(font);
            y += fm.getAscent();
            g.drawString(cjkToDraw, x, y);
        }

        // 绘制开门侧提示非 CJK
        font = ROBOTO_REGULAR.deriveFont(22.0);
        fm = g.getFontMetrics(font);
        g.setFont(font);
        y += fm.getAscent();
        g.drawString(nonCjkToDraw, x, y);
    }

    if (CONFIG.showPlatformNumber) {
        // 获取各字符宽高
        const platformNameFont = ROBOTO_BOLD.deriveFont(42.0);
        const platformNameWidth = g.getFontMetrics(platformNameFont).stringWidth(thisStation.platformName);
        const platformNameHeight = g.getFontMetrics(platformNameFont).getAscent();
        const platformCjkFont = SOURCE_HAN_SANS_CN_BOLD.deriveFont(22.0);
        const platformCjkWidth = showCjk ? g.getFontMetrics(platformCjkFont).stringWidth(getMatching(PLATFORM, true)) : 0;
        const platformCjkHeight = showCjk ? g.getFontMetrics(platformCjkFont).getAscent() : 0;
        const platformNonCjkFont = ROBOTO_BOLD.deriveFont(16.0);
        const platformNonCjkWidth = g.getFontMetrics(platformNonCjkFont).stringWidth(getMatching(PLATFORM, false));
        const platformNonCjkHeight = g.getFontMetrics(platformNonCjkFont).getAscent();

        // 绘制站台矩形框
        const platformRectWidth = Math.max(Math.max(platformNameWidth, platformCjkWidth), platformNonCjkWidth) + HORIZONTAL_SPACING;
        const platformRectHeight = platformNameHeight + platformCjkHeight + platformNonCjkHeight + VERTICAL_SPACING * 2;
        x = WIDTH - HORIZONTAL_SPACING * 2 - platformRectWidth;
        y = startY;
        g.setColor(Color.GRAY);
        g.fillRoundRect(x, y, platformRectWidth, platformRectHeight, 5, 5);

        // 绘制站台编号
        g.setColor(Color.WHITE);
        g.setFont(platformNameFont);
        y += platformNameHeight;
        g.drawString(thisStation.platformName, x + (platformRectWidth - platformNameWidth) / 2, y);

        // 绘制“站台”字样 CJK
        if (showCjk) {
            g.setFont(platformCjkFont);
            y += platformCjkHeight;
            g.drawString(getMatching(PLATFORM, true), x + (platformRectWidth - platformCjkWidth) / 2, y);
        }

        // 绘制“站台”字样非 CJK
        y += VERTICAL_SPACING;
        g.setFont(platformNonCjkFont);
        y += platformNonCjkHeight;
        g.drawString(getMatching(PLATFORM, false), x + (platformRectWidth - platformNonCjkWidth) / 2, y);
    }
}

function drawRightPartComingNextScreen(g, routeColor, showCjk, lastRouteDestination, nextStationIndex, stationInfoList) {
    let font;
    let fm;
    let x = LEFT_WIDTH + ROUTE_BAR_WIDTH + HORIZONTAL_SPACING * 2;
    let y = START_Y / 2;

    // 绘制“即将到达” CJK
    g.setColor(Color.DARK_GRAY);
    if (showCjk) {
        font = SOURCE_HAN_SANS_CN_REGULAR.deriveFont(28.0);
        fm = g.getFontMetrics(font);
        y += fm.getAscent();
        g.setFont(font);
        g.drawString(getMatching(COMING_NEXT, true), x, y);

        // 绘制“即将到达”非 CJK
        y += fm.getDescent();
    }

    // 绘制“即将到达”非 CJK
    font = ROBOTO_REGULAR.deriveFont(24.0);
    fm = g.getFontMetrics(font);
    g.setFont(font);
    y += fm.getAscent();
    g.drawString(getMatching(COMING_NEXT, false), x, y);

    let edgeHeight = HEIGHT / 10; // 顶部和底部箭头的高度
    let height = (HEIGHT - edgeHeight * 2) / 4; // 分割线之间的高
    let startX = WIDTH / 2;
    x = startX;
    y = HEIGHT;

    // 绘制底端矩形
    g.setColor(Color.GRAY);
    g.fillRect(startX, y - edgeHeight - 2 - 5, ARROW_WIDTH, edgeHeight + 2 + 5);
    y -= edgeHeight + 2;
    let skipTop = false;

    for (let i = nextStationIndex - 1; i < Math.min(nextStationIndex + 3, stationInfoList.length); i++) {
        let currentStation = i == -1 ? lastRouteDestination : stationInfoList[i];

        // 绘制箭头（当最后一站时箭头顶端水平）
        if (i == stationInfoList.length - 1) {
            let xPoints = [x, x, x + ARROW_WIDTH / 2, x + ARROW_WIDTH, x + ARROW_WIDTH];
            let yPoints = [y - height, y, y - 5, y, y - height];
            g.setColor(routeColor);
            g.fillPolygon(xPoints, yPoints, 5);
            skipTop = true;
        } else {
            let xPoints = [x, x, x + ARROW_WIDTH / 2, x + ARROW_WIDTH, x + ARROW_WIDTH, x + ARROW_WIDTH / 2];
            let yPoints = [y - height, y, y - 5, y, y - height, y - height - 5];
            g.setColor(i < nextStationIndex ? Color.GRAY : routeColor);
            g.fillPolygon(xPoints, yPoints, 6);
        }

        // 在箭头中心绘制圆
        const radius = 7;
        g.setColor(Color.WHITE);
        g.fillOval(x + ARROW_WIDTH / 2 - radius, y - 5 - height / 2 - radius, radius * 2, radius * 2);

        // 在各站底部绘制分割线（上一站除外）
        x += ARROW_WIDTH + HORIZONTAL_SPACING * 2;
        if (i >= nextStationIndex) {
            g.setColor(Color.GRAY);
            g.drawLine(x, y, WIDTH - HORIZONTAL_SPACING, y);
        }

        // 绘制 CJK 站名（站名只含非 CJK 时，则绘制非 CJK 站名）
        const hasCjk = !TextUtil.getCjkParts(currentStation.stationName).isEmpty();
        let strToDraw = hasCjk ? TextUtil.getCjkParts(currentStation.stationName) : TextUtil.getNonCjkParts(currentStation.stationName);
        let fontSize = calculateMaxFontSize(g, hasCjk ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD, strToDraw, (WIDTH - x) / 2, height, 0, 0, false);
        font = (hasCjk ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD).deriveFont(fontSize);
        fm = g.getFontMetrics(font);
        g.setFont(font);
        g.setColor(i == nextStationIndex ? Color.RED : Color.BLACK);
        g.drawString(strToDraw, x, y - fm.getDescent());

        // 站名同时含 CJK 和非 CJK 时，绘制非 CJK 站名
        x += fm.stringWidth(strToDraw) + HORIZONTAL_SPACING;
        strToDraw = TextUtil.getNonCjkParts(currentStation.stationName);
        if (hasCjk && !strToDraw.isEmpty()) {
            font = ROBOTO_BOLD.deriveFont(calculateMaxFontSize(g, ROBOTO_BOLD, strToDraw, (WIDTH - x) / 2, height, 0, fontSize * 2 / 3, false));
            fm = g.getFontMetrics(font);
            g.setFont(font);
            g.setColor(i == nextStationIndex ? Color.RED : Color.BLACK);
            g.drawString(strToDraw, x, y - fm.getDescent());
            x += fm.stringWidth(strToDraw);
        }

        // 绘制换乘信息
        if (currentStation != null && currentStation.interchangeInfo != null) {
            let criticalX = x;
            x = WIDTH - HORIZONTAL_SPACING;
            for (let j = currentStation.interchangeInfo.length - 1; j >= 0; j--) {
                let interchangeRoute = currentStation.interchangeInfo[j];
                if (interchangeRoute != null && i >= 0) {
                    let width = drawRouteName(g, x, y - fm.getDescent(), 0, RIGHT_PART_INTERCHANGE_ROUTE_NAME_HEIGHT, criticalX, formatName(interchangeRoute.name), i < nextStationIndex ? Color.DARK_GRAY : interchangeRoute.color, false, true, interchangeRoute.isConnectingStation, Color.BLACK);
                    if (width == 0) {
                        // 绘制省略号
                        font = ROBOTO_REGULAR.deriveFont(28.0);
                        fm = g.getFontMetrics(font);
                        g.setFont(font);
                        g.setColor(Color.BLACK);
                        g.drawString("...", x - fm.stringWidth("..."), y - fm.getDescent());
                        break;
                    }
                    x -= width + 10;
                }
            }
        }

        x = startX;
        y -= height + 2;
    }

    // 绘制顶端箭头
    if (!skipTop) {
        let xPoints = [startX, startX, startX + ARROW_WIDTH / 2, startX + ARROW_WIDTH, startX + ARROW_WIDTH];
        let yPoints = [y - edgeHeight, y, y - 5, y, y - edgeHeight];
        g.setColor(routeColor);
        g.fillPolygon(xPoints, yPoints, 5);
    }
}

function drawRightPartFullRouteMap(g, useCjk, rightDoor, routeColor, nextStationIndex, stationInfoList) {
    let platformCount = stationInfoList.length;

    let x = LEFT_WIDTH + ROUTE_BAR_WIDTH + HORIZONTAL_SPACING;

    const rightWidth = WIDTH - HORIZONTAL_SPACING - x - platformCount * 2; // 路线图区域的总宽度（考虑2像素空隙）
    const width = rightWidth / platformCount; // 每个平行四边形的宽
    const height = 22; // 每个平行四边形的高

    for (let i = rightDoor ? platformCount - 1 : 0; rightDoor ? i >= 0 : i < platformCount; i = i + (rightDoor ? -1 : 1)) { // 绘制每一个平行四边形
        let y = START_Y;

        let hasPassed = i < nextStationIndex; // 已经过车站灰显
        let nextStation = i == nextStationIndex;

        // 绘制平行四边形
        let xPoints, yPoints;
        if (i == 0) { // 列车前进方向的尾端车站画梯形
            xPoints = rightDoor ? [x + 15, x, x + width, x + width] : [x, x, x + width, x + 15 + width];
        } else {
            xPoints = [x + 15, x, x + width, x + 15 + width];
        }
        yPoints = [START_Y, START_Y + height, START_Y + height, START_Y];
        g.setColor(nextStation ? Color.RED : hasPassed ? Color.LIGHT_GRAY : routeColor);
        g.fillPolygon(xPoints, yPoints, 4);

        // TODO 绘制预计时间

        // 绘制站名
        let strToDraw = getMatching(stationInfoList[i].stationName, useCjk);
        let font = ((useCjk && TextUtil.isCjk(strToDraw)) ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD).deriveFont(18.0);
        let fm = g.getFontMetrics(font);
        g.setFont(font);
        g.setColor(nextStation ? Color.RED : hasPassed ? Color.DARK_GRAY : Color.BLACK);

        y += height + VERTICAL_SPACING;
        if (useCjk && TextUtil.isCjk(strToDraw)) {
            for (let k = 0; k < strToDraw.length(); k++) {
                y += fm.getAscent();
                g.drawString(strToDraw.substring(k, k + 1), x + (width - fm.charWidth(strToDraw.charAt(k))) / 2, y); // BUG 似乎不能使用 java.lang.String.valueOf(strToDraw.charAt(k))
            }
        } else {
            let defaultAt = g.getTransform();
            let at = new AffineTransform();
            at.setToRotation(90 * Math.PI / 180, x + (width - fm.getAscent()) / 2, y);
            g.transform(at);

            g.drawString(strToDraw, x + (width - fm.getAscent()) / 2, y);

            y += fm.stringWidth(strToDraw);
            g.setTransform(defaultAt);
        }

        // 绘制换乘信息
        if (stationInfoList[i].interchangeInfo != null) {
            y += VERTICAL_SPACING * 2;
            for (let interchangeRoute of stationInfoList[i].interchangeInfo) {
                if (interchangeRoute != null) {
                    y += drawRouteName(g, x + width / 2, y, CONFIG.allowOverflow ? 0 : width, RIGHT_PART_INTERCHANGE_ROUTE_NAME_HEIGHT * 2 / 3, 0, getMatching(interchangeRoute.name, useCjk), hasPassed ? Color.DARK_GRAY : interchangeRoute.color, true, false, interchangeRoute.isConnectingStation, Color.BLACK) + 5;

                    // 对于换乘路线，在平行四边形底部绘制细线
                    g.setColor(hasPassed ? Color.GRAY : darkenColor(routeColor, 0.4));
                    if (i == 0 && rightDoor) { // 右侧屏
                        xPoints[0] = xPoints[1] + 4;
                    } else if (i == 0) { // 左侧屏
                        xPoints[3] = xPoints[2] + 4;
                    } else {
                        xPoints[0] = xPoints[1] + 4;
                        xPoints[3] = xPoints[2] + 4;
                    }
                    yPoints[0] = yPoints[1] - 5;
                    yPoints[3] = yPoints[2] - 5;
                    g.fillPolygon(xPoints, yPoints, 4);
                }
            }
        }

        x += width + 2;
    }
}

function drawBlueScreen(g, strToDraw) {
    let x = HORIZONTAL_SPACING * 2;
    let y = VERTICAL_SPACING * 4;

    g.setColor(rgbToColor(0, 0, 170));
    g.fillRect(0, 0, WIDTH, HEIGHT);

    let font = ROBOTO_BOLD.deriveFont(66.0);
    let fm = g.getFontMetrics(font);
    g.setFont(font);
    g.setColor(Color.WHITE);
    y += fm.getAscent();
    g.drawString(":(", x, y);
    y += fm.getDescent();

    // 错误信息（CJK）
    font = SOURCE_HAN_SANS_CN_BOLD.deriveFont(calculateMaxFontSize(g, SOURCE_HAN_SANS_CN_BOLD, getMatching(strToDraw, true), WIDTH - HORIZONTAL_SPACING * 4, 0, 0, 0, false));
    fm = g.getFontMetrics(font);
    g.setFont(font);
    y += fm.getAscent();
    g.drawString(getMatching(strToDraw, true), x, y);
    y += fm.getDescent();

    // 错误信息（非 CJK）
    font = ROBOTO_BOLD.deriveFont(calculateMaxFontSize(g, ROBOTO_BOLD, getMatching(strToDraw, false), WIDTH - HORIZONTAL_SPACING * 4, 0, 0, 0, false));
    fm = g.getFontMetrics(font);
    g.setFont(font);
    y += fm.getAscent();
    g.drawString(getMatching(strToDraw, false), x, y);
    y += fm.getDescent();

    // 关于 LCD
    g.setColor(Color.GRAY);
    font = SOURCE_HAN_SANS_CN_BOLD.deriveFont(16.0);
    fm = g.getFontMetrics(font);
    g.setFont(font);
    y += VERTICAL_SPACING * 2 + fm.getAscent();
    g.drawString("LCD " + AUTHOR + ". 检查更新 (For Updates): https://www.mtrbbs.top/thread-5656-1-1.html; 使用文档 (For Document): https://mtr.jeffreyg1228.me/", x, y);

    // 版本信息
    font = ROBOTO_BOLD.deriveFont(16.0);
    fm = g.getFontMetrics(font);
    g.setFont(font);
    x = WIDTH - HORIZONTAL_SPACING * 2;
    y = HORIZONTAL_SPACING * 2;
    // MTR 版本
    strToDraw = "MTR: " + Resources.getMTRVersion();
    y += fm.getAscent();
    g.drawString(strToDraw, x - fm.stringWidth(strToDraw), y);
    // NTE 版本
    strToDraw = "NTE: " + Resources.getNTEVersion() + " (" + Resources.getNTEVersionInt() + ")";
    y += fm.getAscent();
    g.drawString(strToDraw, x - fm.stringWidth(strToDraw), y);
    // LCD 版本
    strToDraw = "shLCD: " + LCD_VERSION;
    y += fm.getAscent();
    g.drawString(strToDraw, x - fm.stringWidth(strToDraw), y);
}

/**
 * 绘制路线名称。
 *
 * @param x            当 vertical 为 false 时，表示路线框顶点的 x 坐标；当 vertical 为 true 时，表示路线框上边沿中点的 x 坐标。当 right 为 false 时，表示左上顶点；当 right 为 true 时，表示右上顶点。
 * @param y            路线框顶点的 y 坐标。当 right 为 false 时，表示左上顶点；当 right 为 true 时，表示右下顶点。
 * @param width        路线框的最大宽度。传入 0 则不限制。
 * @param height       路线框的最大高度。传入 0 则不限制。
 * @param criticalX    当 right 为 false 时，如果 x 与本路线框宽度之和大于此值，则不绘制并返回 0；当 right 为 true 时，如果 x 与本路线框宽度之差小于此值，则不绘制并返回 0。仅在 vertical 为 false 时有效。
 * @param vertical     是否处于纵向排版模式。主要影响形参 x 的处理和返回值。
 * @param right        是否处于右对齐排版模式。主要影响形参 x、y 和 criticalX 的处理。
 * @param outline      是否绘制空心矩形。
 * @param outlineColor 空心矩形的路线字体颜色。
 * @return 当 vertical 为 false 时，返回路线框的宽度（可能为 0，表示已绘制不下更多路线信息）；当 vertical 为 true 时，返回路线框的高度。
 */
function drawRouteName(g, x, y, width, height, criticalX, routeName, routeColor, vertical, right, outline, outlineColor) {
    let font = (TextUtil.isCjk(routeName) ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD).deriveFont(calculateMaxFontSize(g, TextUtil.isCjk(routeName) ? SOURCE_HAN_SANS_CN_BOLD : ROBOTO_BOLD, routeName, (!vertical && width > HORIZONTAL_SPACING) ? width - HORIZONTAL_SPACING : width, (!vertical && height > HORIZONTAL_SPACING) ? height - VERTICAL_SPACING : height, 0, 0, false));
    let fm = g.getFontMetrics(font);
    height = height == 0 ? fm.getHeight() : height;
    width = width == 0 ? Math.max(fm.stringWidth(routeName) + 10, height) : Math.min(Math.max(fm.stringWidth(routeName) + 10, height), width);

    if (!vertical && (right ? x - width < criticalX : x + width > criticalX)) {
        return 0;
    }

    x = vertical ? x - width / 2 : x;
    x = right ? x - width : x;
    y = right ? y - height : y;

    // 画矩形
    g.setColor(routeColor);
    if (outline) {
        g.drawRoundRect(x, y, width, height, 5, 5);
    } else {
        g.fillRoundRect(x, y, width, height, 5, 5);
    }

    // 在矩形中央画文字
    g.setColor(outline ? outlineColor : isLightColor(routeColor) ? Color.BLACK : Color.WHITE);
    g.setFont(font);
    x += (width - fm.stringWidth(routeName)) / 2;
    y += (height - fm.getHeight()) / 2 + fm.getAscent();
    g.drawString(routeName, x, y);

    return vertical ? height : width;
}