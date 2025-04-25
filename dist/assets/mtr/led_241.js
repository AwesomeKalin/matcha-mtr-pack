

importPackage(java.awt);
importPackage(java.awt.geom);

rawTrainModel = ModelManager.loadRawModel(Resources.manager(), Resources.idr("mtr:222/pids.obj"), null);
baseTrainModel = ModelManager.uploadVertArrays(rawTrainModel);

rawLedModel = ModelManager.loadRawModel(Resources.manager(), Resources.idr("mtr:241/led.obj"), null);
baseLedModel = ModelManager.uploadVertArrays(rawLedModel);

function create(ctx, state, train) {
  state.pisTexture = new GraphicsTexture(600, 180);
  state.trainModel = baseTrainModel.copyForMaterialChanges();
  state.trainModel.replaceTexture("pis.png", state.pisTexture.identifier);

  state.ledTexture = new GraphicsTexture(492, 61);
  state.LedModel = baseLedModel.copyForMaterialChanges();
  state.LedModel.replaceTexture("zzp.png", state.ledTexture.identifier);

  state.pisRateLimit = new RateLimit(0.02);
  state.trainLedState = new StateTracker();
  state.trainLedinState = new StateTracker();
}

function dispose(ctx, state, train) {
  state.pisTexture.close();
  state.ledTexture.close();
}

sansFont = Resources.getSystemFont("Noto Sans");
function render(ctx, state, train) {
  var stations = train.getThisRoutePlatforms();
  if (stations.size() <= 1) return;
  var nextIndex = train.getThisRoutePlatformsNextIndex();
  var nextSta = stations.get(Math.min(nextIndex, stations.size() - 1));
  var name = TextUtil.getCjkParts(nextSta.destinationName);



  var nextstaname = stations.get(nextIndex).station.name;

  var ledStr = "欢迎乘坐轨道交通" + TextUtil.getCjkParts(nextSta.route.name) + "列车    " + "本次列车开往" + TextUtil.getCjkParts(nextSta.destinationName) + "    前方到站" + TextUtil.getCjkParts(nextstaname) + "    当前系统时间" + java.time.LocalTime.now().toString().substring(0, 5) + "          " + "Welcome to Rail Transit " + TextUtil.getNonCjkParts(nextSta.route.name) + "    This train is bound for " + TextUtil.getNonCjkParts(nextSta.destinationName) + "    Next Station is " + TextUtil.getNonCjkParts(nextstaname) + "    " + java.time.LocalTime.now().toString().substring(0, 5);
  var doorsidel = "左";
  var doorsider = "右";
  fwdRail = train.path().get(train.getRailIndex(train.getRailProgress(0), true)).rail;
  bwdRail = train.path().get(train.getRailIndex(train.getRailProgress(train.trainCars()), false)).rail;

  if (train.doorValue() > 0) {
    state.trainLedinState.setState("atsta");

    ledStr = TextUtil.getCjkParts(nextstaname) + "到了    请先下后上    注意站台与列车之间的间隙              " + "We are now at " + TextUtil.getNonCjkParts(nextstaname) + " station";
  } else if (train.speed() == 0 && train.isOnRoute() == true && fwdRail.railType != "PLATFORM") {
    state.trainLedinState.setState("stop");
    ledStr = "现在是临时停车,列车设备安全,请您耐心等候,由此给您带来不便敬请谅解";
    //if (trainLedinState.stateNowFirst()&&trainLedinState.stateNow()=="stop"){
    //}
  }
  else {
    state.trainLedinState.setState("notatsta");
    var ledStr = "欢迎乘坐轨道交通" + TextUtil.getCjkParts(nextSta.route.name) + "列车    " + "本次列车开往" + TextUtil.getCjkParts(nextSta.destinationName) + "    前方到站" + TextUtil.getCjkParts(nextstaname) + "    当前系统时间" + java.time.LocalTime.now().toString().substring(0, 5) + "          " + "Welcome to Rail Transit " + TextUtil.getNonCjkParts(nextSta.route.name) + "    This train is bound for " + TextUtil.getNonCjkParts(nextSta.destinationName) + "    Next Station is " + TextUtil.getNonCjkParts(nextstaname) + "    " + java.time.LocalTime.now().toString().substring(0, 5);
  }


  if (state.pisRateLimit.shouldUpdate()) {
    var g = state.pisTexture.graphics;
    var fontside = 120;
    g.setFont(sansFont.deriveFont(fontside));
    var destinationWidth = g.getFontMetrics().stringWidth(name);
    ctx.setDebugInfo("width", (destinationWidth));
    if (destinationWidth < 600) {
      g.setColor(Color.BLACK);
      g.fillRect(0, 0, 600, 180);
      g.setColor(Color.RED);
      g.setFont(sansFont.deriveFont(fontside));
      g.drawString(name, 300 - destinationWidth / 2, 140);

    } else {
      g.setColor(Color.BLACK);
      g.fillRect(0, 0, 600, 180);
      g.setColor(Color.RED);
      g.drawString(name, -state.trainLedState.stateNowDuration() * 400 + 900.0, 140);
      if (-state.trainLedState.stateNowDuration() * 400 + 900.0 <= -g.getFontMetrics().stringWidth(name)) {
        g.clearRect(0, 0, 1200, 256);
        state.trainLedState.setState("repeat");
        state.trainLedState.setState("normal");
      }

    }
    state.pisTexture.upload();

    var fontSize = 60;
    let j = state.ledTexture.graphics;
    j.setColor(Color.BLACK);
    j.clearRect(0, 0, 1200, 180);
    j.setColor(Color.RED);
    j.setFont(sansFont.deriveFont(fontSize));
    j.drawString(ledStr, -state.trainLedinState.stateNowDuration() * 300 + 900.0, 56);
    if (-state.trainLedinState.stateNowDuration() * 300 + 900.0 <= -j.getFontMetrics().stringWidth(ledStr)) {
      j.clearRect(0, 0, 1200, 256);
      state.trainLedinState.setState("repeat");
      state.trainLedinState.setState("normal");
    };
    state.ledTexture.upload();
    ctx.setDebugInfo("railType", fwdRail.railType);
  }


  ctx.setDebugInfo("time", (state.trainLedState.stateNowDuration()));
  ctx.setDebugInfo("state", (state.trainLedState.stateNow()));
  var matrices = new Matrices();

  matrices.pushPose();
  matrices.rotateY(Math.PI);
  ctx.drawCarModel(state.trainModel, 0, matrices);
  matrices.popPose();

  matrices.pushPose();
  ctx.drawCarModel(state.trainModel, train.trainCars() - 1, matrices);
  matrices.popPose();

  for (i = 0; i < train.trainCars(); i++) {

    if (i == 0) {
      matrices.pushPose();
      matrices.translate(0, 0, -6.54);
      ctx.drawCarModel(state.LedModel, i, matrices);
      matrices.popPose();

    } else if (i == train.trainCars() - 1) {
      matrices.pushPose();
      matrices.translate(0, 0, 6.54);
      ctx.drawCarModel(state.LedModel, i, matrices);
      matrices.popPose();

    } else {
      matrices.pushPose();
      matrices.translate(0, 0, 6.52);
      ctx.drawCarModel(state.LedModel, i, matrices);
      matrices.popPose();
      matrices.pushPose();
      matrices.translate(0, 0, -6.52);
      ctx.drawCarModel(state.LedModel, i, matrices);
      matrices.popPose();
    }

  }
}
