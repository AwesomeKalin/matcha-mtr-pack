importPackage(java.awt);
importPackage(java.awt.font);
importPackage(java.text);

include("js_util.js");

/**
 * 绘制长文本，支持自动换行。不会在单词中换行导致截断单词。
 * @param x 渲染 {@link TextLayout} 的 X 坐标。
 * @param y 渲染 {@link TextLayout} 的 Y 坐标。
 * @param breakWidth 一行字符的最大宽度。
 * @return 最后一行 descent line 与 y 之差。
 */
function drawLongText(g, str, x, y, breakWidth) {
    let paragraph = new AttributedString(str, java.util.Map.of(TextAttribute.FONT, g.getFont())).getIterator();
    let paragraphStart = paragraph.getBeginIndex();
    let paragraphEnd = paragraph.getEndIndex();
    let lineMeasurer = new LineBreakMeasurer(paragraph, g.getFontRenderContext());
    lineMeasurer.setPosition(paragraphStart); // Set position to the index of the first character in the paragraph.

    let beginning = true;
    let descentOffset = 0;
    // Get lines until the entire paragraph has been displayed.
    while (lineMeasurer.getPosition() < paragraphEnd) {
        let layout = lineMeasurer.nextLayout(breakWidth);
        y += beginning ? 0 : layout.getAscent(); // Move y-coordinate by the ascent of the layout.
        layout.draw(g, x, y); // Draw the TextLayout at (drawPosX, drawPosY).
        // y += layout.getDescent(); // Move y-coordinate in preparation for next layout.
        descentOffset += beginning ? layout.getDescent() : layout.getAscent();
        beginning = false;
    }
    return descentOffset;
}

/**
 * 计算符合条件的最大字号。
 * @param maxWidth 以最大字号绘制 text 的最大宽度。传入 0 则不限制。
 * @param maxHeight 以最大字号绘制 text 的最大高度。传入 0 则不限制。
 * @param minFontSize 计算结果不得小于此字号。传入 0 则不限制。
 * @param maxFontSize 计算结果不得大于此字号。传入 0 则不限制。
 * @throws text 为空、maxWidth 小于 0、maxHeight 小于 0、minFontSize 小于 0、maxFontSize 小于 0，或 maxWidth、maxHeight、maxFontSize 都等于 0，抛出此异常。
 * @param vertical 是否竖直绘制。
 * @return 符合条件的最大字号。
 */
function calculateMaxFontSize(g, font, text, maxWidth, maxHeight, minFontSize, maxFontSize, vertical) {
    if (text == null || text.isEmpty() || maxWidth < 0 || maxHeight < 0 || minFontSize < 0 || maxFontSize < 0 || (maxWidth == 0 && maxHeight == 0 && maxFontSize == 0)) {
        throw new Error("calculateMaxFontSize: Invalid input parameters. text: " + text + ", maxWidth: " + maxWidth + ", maxHeight: " + maxHeight + ", minFontSize: " + minFontSize + ", maxFontSize: " + maxFontSize);
    }
    let fontSize = minFontSize;
    let fontMetrics;
    do {
        fontSize += 0.5;
        fontMetrics = g.getFontMetrics(font.deriveFont(fontSize));
    } while (vertical ? ((maxWidth == 0 || fontMetrics.charWidth('龘') < maxWidth) && (maxHeight == 0 || (fontMetrics.getAscent() + fontMetrics.getDescent()) * text.length() < maxHeight))
            : ((maxWidth == 0 || fontMetrics.stringWidth(text) < maxWidth) && (maxHeight == 0 || fontMetrics.getHeight() < maxHeight)));
    return maxFontSize == 0 ? fontSize : Math.min(fontSize, maxFontSize);
}

function getRGBAValue(r, g, b, a) {
    return ((a & 0xFF) << 24) | ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | ((b & 0xFF));
}

/**
 * 通过 R、G、B 值创建 Java 的 Color 对象。
 * 不直接 new 的原因是 JavaScript 中的数字在 Rhino 中总是映射为 Java 的 double 类型，这样匹配的 Color 对象的构造方法仅接受 0~1 范围内的数字。
 * @param {Number} r 
 * @param {Number} g 
 * @param {Number} b 
 * @return {Color} Java 的 Color 对象。
 */
function rgbToColor(r, g, b) {
    r = (r - 0.5) / 255;
    g = (g - 0.5) / 255;
    b = (b - 0.5) / 255;
    return new java.awt.Color(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1));
}

function isLightColor(color) {
    let darkness = 1 - (0.299 * color.getRed() + 0.587 * color.getGreen() + 0.114 * color.getBlue()) / 255;
    return darkness < 0.5;
}

function darkenColor(color, factor) {
    let red = color.getRed() * (1 - factor);
    let green = color.getGreen() * (1 - factor);
    let blue = color.getBlue() * (1 - factor);

    red = Math.min(255, Math.max(0, red));
    green = Math.min(255, Math.max(0, green));
    blue = Math.min(255, Math.max(0, blue));

    return rgbToColor(red, green, blue);
}