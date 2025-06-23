importPackage(java.awt);
importPackage(java.awt.geom);

include("draw.js");
include("mtr_util.js");

var meetNTEVersionRequirement = Resources.getNTEVersionInt() >= 402;
var isMTR4 = Resources.getMTRVersion().includes("4.0");

function create(ctx, state, train) {
    state.dh = dhBase.create();

    if (!meetNTEVersionRequirement || isMTR4) {
        let g = state.dh.graphicsFor("lcd_door_left");
        drawBlueScreen(g, VERSION_ERROR);

        g = state.dh.graphicsFor("lcd_door_right");
        drawBlueScreen(g, VERSION_ERROR);

        state.dh.upload();

        return;
    }

    state.leftPartUseCjkTracker = new CycleTracker([true, CONFIG.leftPartCjkCycle.cjk, false, CONFIG.leftPartCjkCycle.nonCjk]);
}

function dispose(ctx, state, train) {
    state.dh.close();
}

function render(ctx, state, train) {
    for (let i = 0; i < train.trainCars(); i++) {
        ctx.drawCarModel(state.dh.model, i, null);
    }

    if (!meetNTEVersionRequirement || isMTR4) {
        return;
    }

    state.leftPartUseCjkTracker.tick();
    if (state.rightPartScreenTypeTracker != null) {
        state.rightPartScreenTypeTracker.tick();
    }
    if (state.rightPartFullRouteMapUseCjkTracker != null) {
        state.rightPartFullRouteMapUseCjkTracker.tick();
    }

    if (train.shouldRender() && train.shouldRenderDetail() && shouldRepaintLCD(state, train)) {
        if (state.trainStatus == STATUS_ARRIVED || state.trainStatus == STATUS_WAITING_FOR_DEPARTURE || state.trainStatus == STATUS_RETURNING_TO_DEPOT || state.trainStatus == STATUS_NO_ROUTE) { // 部分情况下右屏不切换。STATUS_ARRIVED: 只显示“已到达”屏幕；STATUS_WAITING_FOR_DEPARTURE: 只显示全线信息屏幕；STATUS_RETURNING_TO_DEPOT: 只显示“即将到达”屏幕；STATUS_NO_ROUTE: 只显示蓝屏。
            state.rightPartScreenTypeTracker = undefined;
        } else if (state.rightPartScreenTypeTracker == null) { // 否则，如果 state 中不存在 rightPartScreenTypeTracker，则初始化
            state.rightPartScreenTypeTracker = new CycleTracker([SCREEN_COMING_NEXT, CONFIG.rightPartScreenCycle.comingNext, SCREEN_FULL_ROUTE_MAP, CONFIG.rightPartScreenCycle.fullRouteMap]);
            state.rightPartScreenTypeTracker.tick();
        }

        if ((state.rightPartScreenTypeTracker == null && state.trainStatus != STATUS_WAITING_FOR_DEPARTURE) || (state.rightPartScreenTypeTracker != null && state.rightPartScreenTypeTracker.stateNow() != SCREEN_FULL_ROUTE_MAP)) { // 如果右屏不切换（排除 STATUS_WAITING_FOR_DEPARTURE）或当前右屏不为全线线路图，不切换右屏 CJK。
            state.rightPartFullRouteMapUseCjkTracker = undefined;
        } else if (state.rightPartFullRouteMapUseCjkTracker == null) {
            state.rightPartFullRouteMapUseCjkTracker = new CycleTracker([true, CONFIG.fullRouteMapCjkCycle.cjk, false, CONFIG.fullRouteMapCjkCycle.nonCjk]);
            state.rightPartFullRouteMapUseCjkTracker.tick();
        }

        let platformInfo;
        switch (state.trainStatus) {
            case STATUS_NO_ROUTE:
                platformInfo = null;
                break;
            case STATUS_RETURNING_TO_DEPOT:
                platformInfo = train.getAllPlatforms().get(train.getAllPlatforms().size() - 1);
                break;
            case STATUS_WAITING_FOR_DEPARTURE:
                platformInfo = train.getAllPlatforms().get(0);
                break;
            case STATUS_CHANGING_ROUTE:
                platformInfo = train.getAllPlatforms().get(train.getAllPlatformsNextIndex());
                break;
            default:
                platformInfo = train.getThisRoutePlatforms().get(train.getThisRoutePlatformsNextIndex());
                break;
        }

        const routeInfo = getRouteInfo(train, state.trainStatus, platformInfo);
        if (!checkJsonProperty(state, "routeInfo", routeInfo)) { // 如果 state 中不存在 routeInfo 或 routeInfo 改变
            print("列车 " + train.id() + " 的当前路线信息：" + JSON.stringify(routeInfo));
            state.routeInfo = routeInfo;
        }

        const doorOpenInfo = CONFIG.showDoorOpenInfo ? getDoorOpenInfo(train) : undefined;
        if (CONFIG.showDoorOpenInfo && !checkJsonProperty(state, "doorOpenInfo", doorOpenInfo) && (state.trainStatus != STATUS_ARRIVED || train.isDoorOpening())) { // 如果 state 中不存在 doorOpenInfo 或 doorOpenInfo 改变
            print("列车 " + train.id() + " 的无法开门信息：" + JSON.stringify(doorOpenInfo));
            state.doorOpenInfo = doorOpenInfo;
        }

        let leftPartUseCjk = java.lang.Boolean.parseBoolean(state.leftPartUseCjkTracker.stateNow());
        let rightPartFullRouteMapUseCjk = state.rightPartFullRouteMapUseCjkTracker == null ? null : java.lang.Boolean.parseBoolean(state.rightPartFullRouteMapUseCjkTracker.stateNow());
        let rightPartScreenType = state.rightPartScreenTypeTracker == null ? null : state.rightPartScreenTypeTracker.stateNow();

        let g = state.dh.graphicsFor("lcd_door_left");
        drawScreen(slotCfg.slots[0].texArea[2], slotCfg.slots[0].texArea[3], g, state.routeInfo, state.doorOpenInfo, state.trainStatus == STATUS_RETURNING_TO_DEPOT ? 1 : train.getThisRoutePlatformsNextIndex(), state.trainStatus, leftPartUseCjk, rightPartFullRouteMapUseCjk, rightPartScreenType, train.isReversed(), train.manualAllowed(), train.isCurrentlyManual());

        g = state.dh.graphicsFor("lcd_door_right");
        drawScreen(slotCfg.slots[1].texArea[2], slotCfg.slots[1].texArea[3], g, state.routeInfo, state.doorOpenInfo, state.trainStatus == STATUS_RETURNING_TO_DEPOT ? 1 : train.getThisRoutePlatformsNextIndex(), state.trainStatus, leftPartUseCjk, rightPartFullRouteMapUseCjk, rightPartScreenType, !train.isReversed(), train.manualAllowed(), train.isCurrentlyManual());

        state.dh.upload();
    }
}

function shouldRepaintLCD(state, train) {
    let trainStatus = getTrainStatus(train);
    if (checkProperty(state, "trainStatus", trainStatus)) { // 如果 state 中存在 trainStatus 且符合当前状态
        if (!state.leftPartUseCjkTracker.stateNowFirst() && (state.rightPartScreenTypeTracker == null || !state.rightPartScreenTypeTracker.stateNowFirst()) && (state.rightPartFullRouteMapUseCjkTracker == null || !state.rightPartFullRouteMapUseCjkTracker.stateNowFirst())) { // 并且各个屏幕不需要更新
            if (!CONFIG.showDoorOpenInfo || !train.isDoorOpening()) { // 并且无需绘制无法开门提示
                return false; // 无需重绘 LCD
            }
        }
        return true;
    } else {
        print("列车 " + train.id() + " 状态更新为：" + trainStatus);
        state.trainStatus = trainStatus;
        return true;
    }
}