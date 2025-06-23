include("js_util.js");
include("lang.js");

const CONFIG = JSON.parse(Resources.readString(Resources.idr("config.json")));

/**
 * 表示列车无有效路线。
 */
const STATUS_NO_ROUTE = "no_route";
/**
 * 表示列车正在车厂中等待发车。
 */
const STATUS_WAITING_FOR_DEPARTURE = "waiting_for_departure";
/**
 * 表示列车正在离开车厂。
 */
const STATUS_LEAVING_DEPOT = "leaving_depot";
/**
 * 表示列车正在路线区间正常行驶。
 */
const STATUS_ON_ROUTE = "on_route";
/**
 * 表示列车正停靠站台。
 */
const STATUS_ARRIVED = "arrived";
/**
 * 表示列车正由当前线路终点站驶向下一线路起点站。
 */
const STATUS_CHANGING_ROUTE = "changing_route";
/**
 * 表示列车正在返回车厂。
 */
const STATUS_RETURNING_TO_DEPOT = "returning_to_depot";

/**
 * 获取列车状态。
 * @param {Train} train 要获取列车状态的列车。
 * @return {String} 列车状态。
 * @see {@link STATUS_NO_ROUTE}, {@link STATUS_WAITING_FOR_DEPARTURE}, {@link STATUS_LEAVING_DEPOT}, {@link STATUS_ON_ROUTE}, {@link STATUS_ARRIVED}, {@link STATUS_CHANGING_ROUTE}, {@link STATUS_RETURNING_TO_DEPOT}.
 */
function getTrainStatus(train) {
    let trainStatus = null;
    if (train.getAllPlatforms().size() == 0) {
        trainStatus = STATUS_NO_ROUTE;
    } else if (!train.isOnRoute()) {
        trainStatus = STATUS_WAITING_FOR_DEPARTURE;
    } else if (train.getAllPlatformsNextIndex() == train.getAllPlatforms().size()) {
        trainStatus = STATUS_RETURNING_TO_DEPOT;
    } else if (onPlatformRail(train)) { // train.railProgress() == train.getAllPlatforms().get(train.getAllPlatformsNextIndex()).distance
        trainStatus = STATUS_ARRIVED;
    } else if (train.getAllPlatformsNextIndex() == 0) {
        trainStatus = STATUS_LEAVING_DEPOT;
    } else if (train.getThisRoutePlatformsNextIndex() == train.getThisRoutePlatforms().size()) {
        trainStatus = STATUS_CHANGING_ROUTE;
    } else {
        trainStatus = STATUS_ON_ROUTE;
    }
    return trainStatus;
}

/**
 * 获取列车是否位于站台轨道上，且该站台轨道是列车下一个停靠的站台。
 * @param {Train} train 要获取的列车。
 * @return {Boolean} 
 */
function onPlatformRail(train) {
    let path1 = train.path().get(train.getRailIndex(train.getRailProgress(0), false)); // 车头所在轨道
    let path2 = train.path().get(train.getRailIndex(train.getRailProgress(train.trainCars() - 1), true)); // 车尾所在轨道
    let nextPlatformId = train.getAllPlatforms().get(train.getAllPlatformsNextIndex()).platform.id;
    return path1.dwellTime != 0 && path1.savedRailBaseId == nextPlatformId || path2.dwellTime != 0 && path2.savedRailBaseId == nextPlatformId;
}

/**
 * 获取列车的上一个路线。
 * @param {Train} train 要获取上一个路线的列车。
 * @return {Route} 上一个路线。如果不存在或下一个路线为隐藏路线，返回 null。
 */
function getLastRoute(train, trainStatus) {
    if (trainStatus != STATUS_RETURNING_TO_DEPOT) {
        let thisRouteFirstStation = train.getThisRoutePlatforms().get(0);
        if (train.getAllPlatforms().get(0) != thisRouteFirstStation) { // 列车路径的起点不为本线路起点
            let lastRoute = train.getAllPlatforms().get(train.getAllPlatforms().indexOf(thisRouteFirstStation) - 1).route; // 返回本线路第一个车站的上一个车站所属的路线
            return lastRoute.isHidden ? null : lastRoute;
        }
    }
    return null;
}

/**
 * 获取列车的下一个路线。
 * @param {Train} train 要获取下一个路线的列车。
 * @return {Route} 下一个路线。如果不存在或下一个路线为隐藏路线，返回 null。
 */
function getNextRoute(train, trainStatus) {
    if (trainStatus != STATUS_RETURNING_TO_DEPOT) {
        let thisRouteDestination = train.getThisRoutePlatforms().get(train.getThisRoutePlatforms().size() - 1);
        if (train.getAllPlatforms().get(train.getAllPlatforms().size() - 1) != thisRouteDestination) { // 列车路径的终点不为本线路终点
            let nextRoute = train.getAllPlatforms().get(train.getAllPlatforms().indexOf(thisRouteDestination) + 1).route; // 返回本线路最后一个车站的下一个车站所属的路线
            return nextRoute.isHidden ? null : nextRoute;
        }
    }
    return null;
}

/**
 * 获取列车侧线所在的车厂。
 * @param {Train} train 要获取车厂的列车。
 * @return {Depot} 列车侧线所在的车厂。
 */
function getDepot(train) {
    return getMapValueByKey(MTRClientData.DATA_CACHE.sidingIdToDepot, train.siding().id);
}

/**
 * 获取列车当前路线信息。
 * 对于回库车，返回只有终点站和车厂名称的 stationInfoList。
 * @param {Train} train 要获取路线信息的列车。
 * @param {PlatformInfo} platformInfo 本线路某一站台，用于获取路线信息。
 */
function getRouteInfo(train, trainStatus, platformInfo) {
    if (platformInfo == null) {
        return null;
    }

    let routeName = platformInfo.route.name;
    let routeColor = new Color(platformInfo.route.color);
    let destination = platformInfo.destinationStation == null ? UNKNOWN_STATION : platformInfo.destinationStation.name;
    let lastRouteDestination = getLastRoute(train, trainStatus) == null ? null : train.getAllPlatforms().get(train.getAllPlatforms().indexOf(train.getThisRoutePlatforms().get(0)) - 1).station;
    let circularState = platformInfo.route.circularState.toString();
    let depotName = getDepot(train).name;

    let routeInfo = {
        routeName: routeName,
        routeColor: routeColor,
        destination: destination,
        lastRouteDestination: lastRouteDestination == null ? null : { stationName: lastRouteDestination.name, interchangeInfo: getAllInterchangeRoutes(lastRouteDestination, getLastRoute(train, trainStatus), platformInfo.route) },
        nextRouteInfo: null,
        circularState: circularState,
        depotName: depotName,
        stationInfoList: []
    };

    let nextRoutePlatformInfo = getNextRoute(train, trainStatus) == null ? null : train.getAllPlatforms().get(train.getAllPlatforms().indexOf(train.getThisRoutePlatforms().get(train.getThisRoutePlatforms().size() - 1)) + 1);
    if (nextRoutePlatformInfo != null) {
        routeInfo.nextRouteInfo = {};
        routeInfo.nextRouteInfo.routeName = nextRoutePlatformInfo.route.name;
        routeInfo.nextRouteInfo.routeColor = new Color(nextRoutePlatformInfo.route.color);
        routeInfo.nextRouteInfo.destination = nextRoutePlatformInfo.destinationStation == null ? UNKNOWN_STATION : nextRoutePlatformInfo.destinationStation.name;
        routeInfo.nextRouteInfo.circularState = nextRoutePlatformInfo.route.circularState.toString();
        routeInfo.nextRouteInfo.firstStation = { stationName: nextRoutePlatformInfo.station.name, interchangeInfo: getAllInterchangeRoutes(nextRoutePlatformInfo.station, getNextRoute(train, trainStatus), null) }; // TODO 获取下一个路线的下一个路线
    }

    if (trainStatus == STATUS_RETURNING_TO_DEPOT) { // 对于回库车，train.getThisRoutePlatforms() 为空，故设置只有终点站和车厂名称的 stationInfoList
        routeInfo.stationInfoList.push({ stationName: platformInfo.station.name, interchangeInfo: getAllInterchangeRoutes(platformInfo.station, platformInfo.route, null) });
        routeInfo.stationInfoList.push({ stationName: CONFIG.showDepotName ? depotName : DEFAULT_DEPOT_NAME });
    } else {
        for (let platformInfoo of train.getThisRoutePlatforms()) {
            if (platformInfoo.station == null) {
                routeInfo.stationInfoList.push({
                    platformName: platformInfoo.platform.name,
                    platformDwellTime: 0,
                    stationName: UNKNOWN_STATION,
                    interchangeInfo: []
                });
            } else {
                routeInfo.stationInfoList.push({
                    platformName: platformInfoo.platform.name,
                    platformDwellTime: platformInfoo.platform.dwellTime,
                    reverseAtPlatform: platformInfoo.reverseAtPlatform,
                    stationName: platformInfoo.station.name,
                    interchangeInfo: getAllInterchangeRoutes(platformInfoo.station, platformInfoo.route, getNextRoute(train))
                });
            }
        }
    }

    return routeInfo;
}

/**
 * 停站开门时获取列车的哪些车门无法正常打开。如果一侧的车门均无法打开，则这一侧的开门信息均不会被返回。如果车门不处于正在打开的状态，返回 null。
 * @param {Train} train 要获取开门信息的列车。
 * @returns 
 */
function getDoorOpenInfo(train) {
    if (train.isDoorOpening()) {
        let doorOpenInfo = [], doorOpenInfoLeft = [], doorOpenInfoRight = [];
        for (let carIndex = 0; carIndex < train.trainCars(); carIndex++) {
            if (!train.doorLeftOpen[carIndex]) {
                doorOpenInfoLeft.push(carIndex, false);
                doorOpenInfo.push(carIndex, false);
            }
            if (!train.doorRightOpen[carIndex]) {
                doorOpenInfoRight.push(carIndex, true);
                doorOpenInfo.push(carIndex, true);
            }
        }
        if (doorOpenInfoLeft.length == doorOpenInfoRight.length && doorOpenInfoRight.length == train.trainCars() * 2) {
            return null;
        } else if (doorOpenInfoLeft.length == train.trainCars() * 2) {
            return doorOpenInfoRight;
        } else if (doorOpenInfoRight.length == train.trainCars() * 2) {
            return doorOpenInfoLeft;
        }
        return doorOpenInfo;
    } else {
        return null;
    }
}

/**
 * 获取某车站的所有换乘信息（包括连接车站）。
 * @param {Station} station 要获取换乘信息的车站。
 * @param {Route} thisRoute 本路线。
 * @param {Route} nextRoute 下一个路线。可以为 null。
 * @return {Array} 换乘信息数组。
 */
function getAllInterchangeRoutes(station, thisRoute, nextRoute) {
    let interchangeRoutes = [];
    getInterchangeRoutes(station, thisRoute, nextRoute, false, interchangeRoutes); // 获取本站的换乘信息
    getMapValueByKey(MTRClientData.DATA_CACHE.stationIdToConnectingStations, station).forEach(connectingStation => { // 获取连接车站的换乘信息
        getInterchangeRoutes(connectingStation, thisRoute, nextRoute, true, interchangeRoutes);
    });
    return interchangeRoutes;
}

/**
 * 获取某车站（不含连接车站）的换乘信息。
 * @param {Station} station 要获取换乘信息的车站。
 * @param {Route} thisRoute 本路线。
 * @param {Route} nextRoute 下一个路线。可以为 null。
 * @param {Boolean} isConnectingStation 在获取连接车站的换乘信息时，此参数应传入 true，否则为 false。
 * @param {Array} interchangeRoutes 换乘信息数组，获取到的换乘信息会追加到该数组末尾。
 */
function getInterchangeRoutes(station, thisRoute, nextRoute, isConnectingStation, interchangeRoutes) {
    let thisRouteNameSplit = getNonExtraParts(thisRoute.name);
    let nextRouteNameSplit = nextRoute == null ? null : getNonExtraParts(nextRoute.name);

    let routesInStation = getMapValueByKey(MTRClientData.DATA_CACHE.stationIdToRoutes, station.id);

    if (routesInStation != null) {
        for (let interchangeRoute of routesInStation.values()) {
            if (interchangeRoute.name != thisRouteNameSplit && interchangeRoute.name != nextRouteNameSplit) {
                interchangeRoutes.push({ name: interchangeRoute.name, color: new Color(interchangeRoute.color), isConnectingStation: isConnectingStation });
            }
        }
    }
}