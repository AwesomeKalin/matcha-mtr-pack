/**
 * 在用“||”分割的字符串中，返回“||”之前的所有字符。
 * 如果源字符串不使用“||”分割，则返回该字符串。
 * @param {String} src 源字符串。
 * @returns {String}
 */
function getNonExtraParts(src) {
    return src.includes("||") ? TextUtil.getNonExtraParts(src) : src;
}

/**
 * 在用“|”分割的字符串中，获取其中的 CJK / 非 CJK 部分。
 * 如果源字符串不使用“|”分割，但使用“||”分割，则返回“||”之前的所有字符。
 * 如果源字符串既不使用“|”分割，也不使用“||”分割，则返回该字符串。
 * 如果源字符串多次使用“|”分割，则判断每个部分是否为 CJK 字符，并返回符合条件的所有部分。每个部分间用空格分割。
 * @param {String} src 源字符串。
 * @param {Boolean} isCjk 指定获取字符串中的 CJK 还是非 CJK 部分。
 * @returns {String}
 */
function getMatching(src, isCjk) {
    if (!src.includes("|")) {
        return getNonExtraParts(src);
    }
    return isCjk ? TextUtil.getCjkParts(src) : TextUtil.getNonCjkParts(src);
}

/**
 * 提取源字符串“||”之前的所有字符，然后将所有“|”替换成空格。
 * @param {String} name 源字符串。
 * @returns {String}
 */
function formatName(name) {
    return getNonExtraParts(name).replace('|', ' ');
}

function getMapValueByKey(map, key) {
    for (let entry of map.entrySet()) {
        if (entry.getKey() == key) {
            return entry.getValue();
        }
    }
}

function getMapValueByIndex(map, index) {
    let iterator = map.entrySet().iterator();

    for (let i = 0; i < index && iterator.hasNext(); i++) {
        iterator.next();
    }

    if (iterator.hasNext()) {
        return iterator.next().getValue();
    }

    throw new Error("Map does not contain " + index + " elements");
}

/**
 * 检查某个属性是否存在于对象中，并且属性的 JSON 字符串表示形式等于给定对象的 JSON 字符串表示形式。
 * @param {*} obj 要检查的属性所在的对象。
 * @param {*} propName 要检查的属性名称字符串。
 * @param {*} propValue 要检查的属性值。
 * @returns 
 */
function checkJsonProperty(obj, propName, propValue) {
    return (obj != null && propName in obj) ? JSON.stringify(obj[propName]) == JSON.stringify(propValue) : false;
}

/**
 * 检查某个属性是否存在于对象中，并且属性值等于给定的值。
 * @param {*} obj 要检查的属性所在的对象。
 * @param {*} propName 要检查的属性名称字符串。
 * @param {*} propValue 要检查的属性值。
 * @returns 
 */
function checkProperty(obj, propName, propValue) {
    return (obj != null && propName in obj) ? obj[propName] == propValue : false;
}

function clamp(number, min, max) {
    return Math.min(Math.max(number, min), max);
}

function warn(message) {
    MinecraftClient.displayMessage("§e§l" + message, false);
}