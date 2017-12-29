'use strict';
var React = require('react-native');
var bleManager = React.NativeModules.BleManager;
const bleManagerEmitter = new React.NativeEventEmitter(bleManager);

class BleManager {

    // 已经连接的外围设备
    connectedPeripherals = new Map()

    // 外围设备类型编号
    bleDeviceType = new Map()

    // 扫描状态
    scanState = false

    // 重连次数
    reconnectTimes = 3

    // 当前重连次数
    currentReconnectTime = 0

    // 默认服务UUID
    defaultServicesUUIDs = [
        // '0000FF00-0000-1000-8000-00805F9B34FB',
        // '55540001-5554-0000-0055-4e4954454348'
    ]

    // 扫描UUID服务数组
    scanServicesUUIDs = []

    // // 测试读特征值
    // readCharacteristicUUID = 'ff01'
    //
    // // 测试写特征值
    // writeCharacteristicUUID = 'ff02'

    // 读特征值
    readCharacteristicUUID = '55540001-5554-0001-0055-4E4954454348'

    // 写特征值
    writeCharacteristicUUID = '55540001-5554-0002-0055-4E4954454348'

    /**
     * 发现外围设备事件
     * @param {Object} peripheral 外围设备
     */
    onHandleDiscoverPeripheral = (peripheral) => {

    }

    /**
     * 停止扫描事件
     */
    onHandleStopScan = () => {

    }

    /**
     * 连接状态改变事件
     * @param {Object} peripheral 外围设备
     */
    onHandleConnectStateChanged = (peripheral) => {

    }

    /**
     * 读特征值数据上报事件
     * @param {Object} data 数据
     */
    onHandleUpdateValueForCharacteristic = (data) => {

    }

    /**
     * 提示信息接收事件
     * @param {String} message 消息
     */
    onHandleMessage = (message) => {

    }

    /**
     * 蓝牙状态改变事件
     * @param {Object} data 蓝牙状态
     */
    onHandleBluetoothAdapterUpdateState = (data) => {

    }

    constructor() {
        this.bleDeviceType = new Map();
        this.bleDeviceType.set(0x0110, '解锁器1A');
        this.bleDeviceType.set(0x0111, '解锁器2A');
        this.bleDeviceType.set(0x0120, '地线管理器');
        this.bleDeviceType.set(0x0130, '钥匙管理器');
        this.bleDeviceType.set(0x0140, '铁塔智能锁具');
        this.bleDeviceType.set(0xA010, '灯控制面板');
        this.bleDeviceType.set(0xA020, '家庭门锁');
        this.bleDeviceType.set(0xA030, '炒菜机');
        this.bleDeviceType.set(0xA040, '博佳空调控制器');
    }

    /**
     * 打开bleManager
     */
    open() {
        this.start({showAlert: false, allowDuplicates: false});
        this.connectedPeripherals = new Map()

        this.isPeripheralConnected = this.isPeripheralConnected.bind(this);
        this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
        this.handleStopScan = this.handleStopScan.bind(this);
        this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
        this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
        this.handleBluetoothAdapterUpdateState = this.handleBluetoothAdapterUpdateState.bind(this);

        this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
        this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan);
        this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
        this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);
        this.handlerBluetoothAdapterUpdateState = bleManagerEmitter.addListener('BleManagerDidUpdateState', this.handleBluetoothAdapterUpdateState);
    }

    /**
     * 关闭bleManager
     */
    close() {
        bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
        bleManagerEmitter.removeAllListeners('BleManagerStopScan');
        bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
        bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
        bleManagerEmitter.removeAllListeners('BleManagerDidUpdateState');

        this.handlerDiscover.remove();
        this.handlerStop.remove();
        this.handlerDisconnect.remove();
        this.handlerUpdate.remove();
        this.handlerBluetoothAdapterUpdateState.remove();
    }

    /**
     * 设置自动重连次数
     * @param {Number} times 重连次数
     */
    setReconnectTimes (times) {
        this.reconnectTimes = times;
    }

    /**
     * 获取已连接的外围设备
     * @returns {Map} 已连接的外围设备.
     */
    getConnectedPeripheralArray(){
        let peripherals = new Array();
        this.connectedPeripherals.forEach(function (value, key, map) {
            peripherals.push(value);
        });
        return peripherals;
    }

    /**
     * 蓝牙状态改变事件
     * @param {Object} data 蓝牙状态
     */
    handleBluetoothAdapterUpdateState(data) {
        this.onHandleBluetoothAdapterUpdateState(data);
    }

    /**
     * 发现外围设备
     * @param {Object} peripheral 外围设备
     */
    handleDiscoverPeripheral(peripheral) {
        if(React.Platform.OS === 'ios')
        {
            if(peripheral.advertising.kCBAdvDataManufacturerData !=null && peripheral.advertising.kCBAdvDataManufacturerData.bytes != null)
            {
                if(this.isUTDeviceType(peripheral.advertising.kCBAdvDataManufacturerData.bytes))
                {
                    peripheral.deviceType = this.getDeviceType(peripheral.advertising.kCBAdvDataManufacturerData.bytes, 3);
                    this.onHandleDiscoverPeripheral(peripheral);
                }
            }
        }
        else {
            if(peripheral.advertising.bytes != null)
            {
                if(this.isUTDeviceType(peripheral.advertising.bytes))
                {
                    peripheral.deviceType = this.getDeviceType(peripheral.advertising.bytes, 5);
                    this.onHandleDiscoverPeripheral(peripheral);
                }
            }
        }
    }

    /**
     * 判断是否为优特定义设备
     * @param {Array} advertisingData 广播包数据
     */
    isUTDeviceType(advertisingData) {
        if(React.Platform.OS === 'ios')
        {
            if(advertisingData.length >= 11)
            {
                if(advertisingData[0] === 0x55 && advertisingData[1] === 0x54)
                {
                    return true;
                }
            }
        }
        else {
            if(advertisingData[2] === 0x55 && advertisingData[3] === 0x54)
            {
                return true;
            }
        }
        return false;
    }

    /**
     * 获取设备类型
     * @param {Array} advertisingData 广播包数据
     * @param {Number} offset 偏移量
     */
    getDeviceType(advertisingData, offset) {
        let deviceType = this.bytesToInt16(advertisingData, offset);
        return deviceType;
    }

    /**
     * 字节数组转number
     * @param {Array} data 字节数组
     * @param {Number} offset 便宜量
     */
    bytesToInt16(data, offset) {
        return (data[0 + offset] << 8) + data[1 + offset];
    }

    /**
     * 扫描停止事件
     */
    handleStopScan() {
        this.scanState = false
        this.onHandleStopScan();
    }

    /**
     * 外围设备连接断开事件
     * @param {Object} data 外围设备
     */
    handleDisconnectedPeripheral(data) {
        data.id = data.peripheral
        data.connected = false;
        if (this.connectedPeripherals.has(data.id)) {
            this.connectedPeripherals.delete(data.id);
            this.onHandleConnectStateChanged(data);
        }
    }

    /**
     * 读特征值数据上报
     * @param {Object} data 外围设备
     */
    handleUpdateValueForCharacteristic(data) {
        this.onHandleUpdateValueForCharacteristic(data);
    }

    /**
     * 读取指定特征值数据
     * @param {String} peripheralId 外围设备id
     * @param {String} serviceUUID 读特征值的serviceUUID
     * @param {String} characteristicUUID 读取指定特征值UUID
     */
    read(peripheralId, serviceUUID, characteristicUUID) {
        return new Promise((fulfill, reject) => {
            bleManager.read(peripheralId, serviceUUID, characteristicUUID, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill(data);
                }
            });
        });
    }

    /**
     * 读取外围设备的信号强度
     * @param {String} peripheralId 外围设备id
     */
    readRSSI(peripheralId) {
        return new Promise((fulfill, reject) => {
            bleManager.readRSSI(peripheralId, (error, rssi) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill(rssi);
                }
            });
        });
    }

    /**
     * 读取外围设备服务
     * @param {String} peripheralId 外围设备id
     */
    retrieveServices(peripheralId) {
        return new Promise((fulfill, reject) => {
            bleManager.retrieveServices(peripheralId, (error, peripheral) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill(peripheral);
                }
            });
        });
    }

    /**
     * 向外围设备发送数据
     * @param {Array} Number Array
     * @param {Object} peripheral 外围设备
     */
    sendData (data, peripheral) {
        return new Promise((fulfill, reject) => {
            if(!peripheral)
            {
                reject('Peripheral is null');
            }
            if (this.connectedPeripherals.has(peripheral.id)) {
                let p = this.connectedPeripherals.get(peripheral.id)
                bleManager.writeWithoutResponse(peripheral.id, p.serviceUUID, this.writeCharacteristicUUID, data, 20, 30, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        fulfill();
                    }
                });
            }
            else {
                reject('Peripheral not connected');
            }
        });
    }

    /**
     * 向外围设备发送数据
     * @param {String} peripheralId 外围设备id
     * @param {String} serviceUUID 写特征值serviceUUID
     * @param {String} characteristicUUID 写特征值UUID
     * @param {Array} data Number Array
     * @param {Number} maxByteSize 最大数据长度
     */
    write(peripheralId, serviceUUID, characteristicUUID, data, maxByteSize) {
        if (maxByteSize == null) {
            maxByteSize = 20;
        }
        return new Promise((fulfill, reject) => {
            bleManager.write(peripheralId, serviceUUID, characteristicUUID, data, maxByteSize, (error) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 向外围设备发送数据
     * @param {String} peripheralId 外围设备id
     * @param {String} serviceUUID 写特征值serviceUUID
     * @param {String} characteristicUUID 写特征值UUID
     * @param {Array} data Number Array
     * @param {Number} maxByteSize 最大数据长度
     * @param {Number} queueSleepTime(ms) 队列发送时间间隔
     */
    writeWithoutResponse(peripheralId, serviceUUID, characteristicUUID, data, maxByteSize, queueSleepTime) {
        if (maxByteSize == null) {
            maxByteSize = 20;
        }
        if (queueSleepTime == null) {
            queueSleepTime = 10
        }
        return new Promise((fulfill, reject) => {
            bleManager.writeWithoutResponse(peripheralId, serviceUUID, characteristicUUID, data, maxByteSize, queueSleepTime, (error) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 与外围设备建立连接
     * @param {String} peripheralId 外围设备id
     */
    connect(peripheralId) {
        return new Promise((fulfill, reject) => {
            bleManager.connect(peripheralId, (error) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 与外围设备建立连接并注册通知
     * @param {Object} peripheral 外围设备
     */
    connectAndRegisterNotify(peripheral) {
        if(this.connectedPeripherals.has(peripheral.id))
        {
            this.disconnect(peripheral.id)
            return
        }
        if(this.scanState)
        {
            this.stopScan();
        }
        if (this.currentReconnectTime < this.reconnectTimes) {
            this.connect(peripheral.id).then(() => {
                setTimeout(() => {
                    this.retrieveServices(peripheral.id).then((peripheralInfo) => {
                        if (peripheralInfo.characteristics.length == 0) {
                            this.onHandleMessage('Characteristics not found')
                            return;
                        }
                        if(React.Platform.OS === 'ios')
                        {
                            peripheral.serviceUUID = peripheralInfo.services[0]
                        }
                        else {
                            peripheral.serviceUUID = peripheralInfo.services[0].uuid
                        }
                        this.startNotification(peripheral.id, peripheral.serviceUUID, this.readCharacteristicUUID).then(() => {
                            peripheral.connected = true;
                            this.connectedPeripherals.set(peripheral.id, peripheral);
                            this.onHandleConnectStateChanged(peripheral);
                            this.currentReconnectTime = 0;

                        }).catch((err) => {
                            this.onHandleMessage("RegisterNotify characteristics exception:" + err);
                        });

                    }).catch((err) => {
                        this.onHandleMessage("RetrieveServices exception:" + err);
                    })
                }, 1000);

            }).catch((err) => {
                this.currentReconnectTime ++;
                setTimeout(()=>{this.connectAndRegisterNotify(peripheral);},2000);
            });
        }
        else {
            this.currentReconnectTime = 0;
        }

    }

    /**
     * 与外围设备断开连接
     * @param {String} peripheralId 外围设备id
     */
    disconnect(peripheralId) {
        return new Promise((fulfill, reject) => {
            bleManager.disconnect(peripheralId, (error) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 注册特征值通知
     * @param {String} peripheralId 外围设备id
     * @param {String} serviceUUID 特征值serviceUUID
     * @param {String} characteristicUUID 特征值UUID
     */
    startNotification(peripheralId, serviceUUID, characteristicUUID) {
        return new Promise((fulfill, reject) => {
            bleManager.startNotification(peripheralId, serviceUUID, characteristicUUID, (error) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 注销特征值通知
     * @param {String} peripheralId 外围设备id
     * @param {String} serviceUUID 特征值serviceUUID
     * @param {String} characteristicUUID 特征值UUID
     */
    stopNotification(peripheralId, serviceUUID, characteristicUUID) {
        return new Promise((fulfill, reject) => {
            bleManager.stopNotification(peripheralId, serviceUUID, characteristicUUID, (error) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 检查蓝牙状态
     */
    checkState() {
        bleManager.checkState();
    }

    /**
     * 初始化BleManager
     */
    start(options) {
        return new Promise((fulfill, reject) => {
            if (options == null) {
                options = {};
            }
            bleManager.start(options, (error) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 扫描外围设备
     * @param {Array} serviceUUIDs 外围设备serviceUUIDs
     * @param {Number} seconds(s) 扫描持续时间
     * @param {Boolean} allowDuplicates 是否允许重复扫描设备
     * @param {Object} scanningOptions 是否允许重复扫描设备
     */
    scan(serviceUUIDs, seconds, allowDuplicates, scanningOptions = {}) {
        this.scanState = true;
        return new Promise((fulfill, reject) => {
            if (allowDuplicates == null) {
                allowDuplicates = false;
            }

            // (ANDROID) Match as many advertisement per filter as hw could allow
            // dependes on current capability and availability of the resources in hw.
            if (scanningOptions.numberOfMatches == null) {
                scanningOptions.numberOfMatches = 3
            }

            //(ANDROID) Defaults to MATCH_MODE_AGGRESSIVE
            if (scanningOptions.matchMode == null) {
                scanningOptions.matchMode = 1
            }

            //(ANDROID) Defaults to SCAN_MODE_BALANCED on android
            if (scanningOptions.scanMode == null) {
                scanningOptions.scanMode = 1;
            }
            if (serviceUUIDs.length === 0) {
                serviceUUIDs = this.defaultServicesUUIDs;
            }
            this.scanServicesUUIDs = serviceUUIDs;
            bleManager.scan(this.scanServicesUUIDs, seconds, allowDuplicates, scanningOptions, (error) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 停止扫描外围设备
     */
    stopScan() {
        return new Promise((fulfill, reject) => {
            bleManager.stopScan((error) => {
                if (error != null) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 打开系统蓝牙
     */
    enableBluetooth() {
        return new Promise((fulfill, reject) => {
            bleManager.enableBluetooth((error) => {
                if (error != null) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 获取已经连接的外围设备
     * @param {Array} serviceUUIDs 外围设备serviceUUIDs
     */
    getConnectedPeripherals(serviceUUIDs) {
        return new Promise((fulfill, reject) => {
            bleManager.getConnectedPeripherals(serviceUUIDs, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    if (result != null) {
                        fulfill(result);
                    } else {
                        fulfill([]);
                    }
                }
            });
        });
    }

    /**
     * 获取已经扫描发现的外围设备
     */
    getDiscoveredPeripherals() {
        return new Promise((fulfill, reject) => {
            bleManager.getDiscoveredPeripherals((error, result) => {
                if (error) {
                    reject(error);
                } else {
                    if (result != null) {
                        fulfill(result);
                    } else {
                        fulfill([]);
                    }
                }
            });
        });
    }

    /**
     * 移除已经发现的外围设备
     * @param {String} peripheralId 外围设备id
     */
    removePeripheral(peripheralId) {
        return new Promise((fulfill, reject) => {
            bleManager.removePeripheral(peripheralId, (error) => {
                if (error) {
                    reject(error);
                } else {
                    fulfill();
                }
            });
        });
    }

    /**
     * 判断外围设备是否已经建立连接
     * @param {String} peripheralId 外围设备id
     * @param {Array} serviceUUIDs 外围设备serviceUUIDs
     */
    isPeripheralConnected(peripheralId, serviceUUIDs) {
        return this.getConnectedPeripherals(serviceUUIDs).then((result) => {
            if (result.find((p) => {
                    return p.id === peripheralId;
                })) {
                return true;
            } else {
                return false;
            }
        });
    }
}

module.exports = new BleManager();
