const encode = require('./encoding');
const TextEncoder = encode.TextEncoder;
class DataConvert {
    stringToBytes(str) {
        var bytes = new Array();
        var len, c;
        len = str.length;
        for (var i = 0; i < len; i++) {
            c = str.charCodeAt(i);
            if (c >= 0x010000 && c <= 0x10FFFF) {
                bytes.push(((c >> 18) & 0x07) | 0xF0);
                bytes.push(((c >> 12) & 0x3F) | 0x80);
                bytes.push(((c >> 6) & 0x3F) | 0x80);
                bytes.push((c & 0x3F) | 0x80);
            }
            else if (c >= 0x000800 && c <= 0x00FFFF) {
                bytes.push(((c >> 12) & 0x0F) | 0xE0);
                bytes.push(((c >> 6) & 0x3F) | 0x80);
                bytes.push((c & 0x3F) | 0x80);
            }
            else if (c >= 0x000080 && c <= 0x0007FF) {
                bytes.push(((c >> 6) & 0x1F) | 0xC0);
                bytes.push((c & 0x3F) | 0x80);
            }
            else {
                bytes.push(c & 0xFF);
            }
        }
        return bytes;
    }
    stringToGbkBytes(str) {
        var bytes = new TextEncoder('gbk', { NONSTANDARD_allowLegacyEncoding: true }).encode(str);
        var result = new Array();
        for (let i = 0; i < bytes.length; i++) {
            result.push(bytes[i]);
        }
        return result;
    }
    dateStringToBytes(str) {
        str = str.replace(" ", ""); //去空格
        if (str == null) {
            return null;
        }
        let mod = str.length % 2;
        if (mod > 0)
            str += "0";
        let length = str.length / 2;
        let bytesReturn = new Array(length);
        for (let i = 0; i < length; i++) {
            let strTemp = str.substring(i * 2, i * 2 + 2);
            bytesReturn[i] = parseInt(strTemp.substring(0, 1)) * 16 + parseInt(strTemp.substring(1, 2));
        }
        return bytesReturn;
    }
    bytesToString(arr) {
        if (typeof arr === 'string') {
            return arr;
        }
        var str = '', _arr = arr;
        for (var i = 0; i < _arr.length; i++) {
            var one = _arr[i].toString(2), v = one.match(/^1+?(?=0)/);
            if (v && one.length == 8) {
                var bytesLength = v[0].length;
                var store = _arr[i].toString(2).slice(7 - bytesLength);
                for (var st = 1; st < bytesLength; st++) {
                    store += _arr[st + i].toString(2).slice(2);
                }
                str += String.fromCharCode(parseInt(store, 2));
                i += bytesLength - 1;
            }
            else {
                str += String.fromCharCode(_arr[i]);
            }
        }
        return str;
    }
    bytesToLogString(arr) {
        var str = "";
        for (var i = 0; i < arr.length; i++) {
            var tmp = arr[i].toString(16);
            if (tmp.length == 1) {
                tmp = "0" + tmp;
            }
            str += tmp.toUpperCase() + ' ';
        }
        return str;
    }
    bytesToInt(data, offset) {
        return (data[0 + offset] << 24) + (data[1 + offset] << 16) + (data[2 + offset] << 8) + data[3 + offset];
    }
    bytesToLong(data, offset, count) {
        let bytes = data.slice(offset, offset + count).reverse();
        var value = 0;
        for (var i = count - 1; i >= 0; i--) {
            value = (value * 256) + bytes[i];
        }
        return value;
    }
    bytesToInt16(data, offset) {
        return (data[0 + offset] << 8) + data[1 + offset];
    }
    /// <summary>
    /// 从字节里转出时间yyMMddHHmmss
    /// </summary>
    /// <returns>The to date time.</returns>
    /// <param name="bytes">Bytes.</param>
    /// <param name="index">Index.</param>
    bytesToDateTime(bytes, index) {
        return new Date(bytes[index] + 2000, bytes[index + 1] - 1, bytes[index + 2], bytes[index + 3] + 8, bytes[index + 4], bytes[index + 5]);
    }
    /// <summary>
    /// 整型到数组，高位在前
    /// </summary>
    /// <param name="i"></param>
    /// <returns></returns>
    converIntToBytes(i) {
        let data = new Array(4);
        data[0] = ((0xff000000 & i) >> 24);
        data[1] = ((0xff0000 & i) >> 16);
        data[2] = ((0xff00 & i) >> 8);
        data[3] = (0xff & i);
        return data;
    }
    intToBytes(i, data, offset) {
        data[0 + offset] = (0xff000000 & i) >> 24;
        data[1 + offset] = (0xff0000 & i) >> 16;
        data[2 + offset] = (0xff00 & i) >> 8;
        data[3 + offset] = (0xff & i);
    }
    int16ToBytes(i, data, offset) {
        data[0 + offset] = (0xff00 & i) >> 8;
        data[1 + offset] = 0xff & i;
    }
    getRfid(value) {
        return this.getBytes(value, 6);
    }
    getBytes(value, length) {
        var byteArray = new Array(length);
        for (var index = 0; index < length; index++) {
            var byte = value & 0xff;
            byteArray[index] = byte;
            value = (value - byte) / 256;
        }
        return byteArray.reverse();
    }
    bytes2RfidStr(arr) {
        var str = "";
        for (var i = 0; i < arr.length; i++) {
            var tmp = arr[i].toString(16);
            if (tmp.length == 1) {
                tmp = "0" + tmp;
            }
            str += tmp;
        }
        return str;
    }
    rfid2RfidStr(value) {
        let rfidByte = this.getBytes(value, 6);
        return this.bytes2RfidStr(rfidByte);
    }
    copyWithDestIndex(source, sourceIndex, destination, destinationIndex, destinationLengh) {
        for (var i = 0; i < destinationLengh; i++) {
            destination[destinationIndex] = source[sourceIndex];
            destinationIndex++;
            sourceIndex++;
        }
    }
    copyAllSource(source, destination, length) {
        for (var i = 0; i < length; i++) {
            destination[i] = source[i];
        }
    }
    //根据format获取时间
    getDateTimeString(dateTime, format) {
        var date = {
            "M+": dateTime.getMonth() + 1,
            "d+": dateTime.getDate(),
            "h+": dateTime.getHours(),
            "m+": dateTime.getMinutes(),
            "s+": dateTime.getSeconds(),
            "q+": Math.floor((dateTime.getMonth() + 3) / 3),
            "S+": dateTime.getMilliseconds()
        };
        if (/(y+)/i.test(format)) {
            format = format.replace(RegExp.$1, (dateTime.getFullYear() + '').substr(4 - RegExp.$1.length));
        }
        for (var k in date) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length == 1
                    ? date[k] : ("00" + date[k]).substr(("" + date[k]).length));
            }
        }
        return format;
    }
    getJsqVersion(versionArray) {
        let versionStr = this.bytesToString(versionArray);
        let version = 'V ' + versionStr.substring(0, 1) + '.' + versionStr.substring(1, 2) + '' + versionStr.substring(2, 3) + '.' + versionStr.substring(3, 4) + '' + versionStr.substring(4, 5);
        return version;
    }
    //降序排序
    descSort(a, b) {
        if (a > b) {
            return -1; // 如果是降序排序，返回-1。
        }
        else if (a === b) {
            return 0;
        }
        else {
            return 1; // 如果是降序排序，返回1。
        }
    }
    //升序排序
    orderBySort(a, b) {
        if (a > b) {
            return 1; // 如果是降序排序，返回1。
        }
        else if (a === b) {
            return 0;
        }
        else {
            return -1; // 如果是降序排序，返回-1。
        }
    }
}
export default new DataConvert();