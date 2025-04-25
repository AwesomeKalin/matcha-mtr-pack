

importPackage(java.awt);
importPackage(java.awt.geom);

rawTrainModel = ModelManager.loadRawModel(Resources.manager(), Resources.idr("mtr:222/pids.obj"), null);
baseTrainModel = ModelManager.uploadVertArrays(rawTrainModel);

function create(ctx, state, train) {
    state.pisTexture = new GraphicsTexture(600, 180);
    state.trainModel = baseTrainModel.copyForMaterialChanges();
    state.trainModel.replaceTexture("pis.png", state.pisTexture.identifier);
    state.pisRateLimit = new RateLimit(0.01);
    state.trainLedState = new StateTracker();

}

function dispose(ctx, state, train) {
    state.pisTexture.close();
}

sansFont = Resources.getSystemFont("Noto Sans");
function render(ctx, state, train) {
    var stations = train.getThisRoutePlatforms();
    if (stations.size() <= 1) return;
    var nextIndex = train.getThisRoutePlatformsNextIndex();
    var nextSta = stations.get(Math.min(nextIndex, stations.size() - 1));
    var name = TextUtil.getCjkParts(nextSta.destinationName);

    if (state.pisRateLimit.shouldUpdate()) {
        var g = state.pisTexture.graphics;
        var fontside = 120;
        g.setFont(sansFont.deriveFont(fontside));
        var destinationWidth = g.getFontMetrics().stringWidth(name);
        ctx.setDebugInfo("width",(destinationWidth));
        if (destinationWidth<600){
            g.setColor(Color.BLACK);
            g.fillRect(0, 0, 600, 180);
            g.setColor(Color.RED);
            g.setFont(sansFont.deriveFont(fontside));
            g.drawString(name, 300 - destinationWidth / 2, 140);

        } else {
            g.setColor(Color.BLACK);
            g.fillRect(0, 0, 600, 180);
            g.setColor(Color.RED);
            g.drawString(name, -state.trainLedState.stateNowDuration()*400+900.0, 140);
            if(-state.trainLedState.stateNowDuration()*400+900.0<=-g.getFontMetrics().stringWidth(name)){
                g.clearRect(0, 0, 1200, 256);
                state.trainLedState.setState("repeat");
                state.trainLedState.setState("normal");
            }
        }

    }


    state.pisTexture.upload();
    var matrices = new Matrices();

    matrices.pushPose();
    matrices.rotateY(Math.PI);
    ctx.drawCarModel(state.trainModel, 0, matrices);
    matrices.popPose();
    
    matrices.pushPose();
    ctx.drawCarModel(state.trainModel, train.trainCars()-1, matrices);
    matrices.popPose();
}
