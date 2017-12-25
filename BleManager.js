'use strict';
var React = require('react-native');
var bleManager = React.NativeModules.BleManager;
const bleManagerEmitter = new React.NativeEventEmitter(bleManager);

class BleManager {

    connectedPeripherals = new Map()

    bleDeviceType = new Map()

    scanState = false

    reconnectTimes = 3

    currentReconnectTime = 0

    serviceUUID = ''

    defaultServicesUUIDs = [
        '0000FF00-0000-1000-8000-00805F9B34FB',
        '55540001-5554-0000-0055-4e4954454348'
    ]

    scanServicesUUIDs = []

    //test
    // readCharacteristic = 'ff01'
    // writeCharacteristic = 'ff02'

    readCharacteristic = '55540001-5554-0001-0055-4E4954454348'

    writeCharacteristic = '55540001-5554-0002-0055-4E4954454348'

    onHandleDiscoverPeripheral = (peripheral) => {

    }

    onHandleStopScan = () => {

    }

    onHandleConnectStateChanged = (data) => {

    }

    onHandleUpdateValueForCharacteristic = (data) => {

    }

    onHandleMessage = (message) => {

    }

    constructor() {
        this.bleDeviceType.set(0x0110, '解锁器1A');
        this.bleDeviceType.set(0x0111, '解锁器2A');
        this.bleDeviceType.set(0x0120, '地线管理器');
        this.bleDeviceType.set(0x0130, '钥匙管理器');
        this.bleDeviceType.set(0x0140, '铁塔智能锁具');
        this.bleDeviceType.set(0xA010, '灯控制面板');
        this.bleDeviceType.set(0xA020, '家庭门锁');
        this.bleDeviceType.set(0xA030, '炒菜机');
        this.bleDeviceType.set(0xA040, '博佳空调控制器');

        this.connectedPeripherals = new Map()

        this.isPeripheralConnected = this.isPeripheralConnected.bind(this);
        this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
        this.handleStopScan = this.handleStopScan.bind(this);
        this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
        this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
    }

    open() {
        this.start({showAlert: false, allowDuplicates: false});
        this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
        this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan);
        this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
        this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);
    }

    close() {
        this.handlerDiscover.remove();
        this.handlerStop.remove();
        this.handlerDisconnect.remove();
        this.handlerUpdate.remove();
    }

    getConnectedPeripherals(){
        return this.connectedPeripherals;
    }

    handleDiscoverPeripheral(peripheral) {
        this.onHandleDiscoverPeripheral(peripheral);
    }

    handleStopScan() {
        this.scanState = false
        this.onHandleStopScan();
    }

    handleDisconnectedPeripheral(data) {
        data.id = data.peripheral
        data.connected = false;
        if (this.connectedPeripherals.has(data.id)) {
            this.connectedPeripherals.delete(data.id);
        }
        this.onHandleConnectStateChanged(data);
    }

    handleUpdateValueForCharacteristic(data) {
        this.onHandleUpdateValueForCharacteristic(data);
    }


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

    sendData (data, peripheral) {
        return new Promise((fulfill, reject) => {
            if (this.connectedPeripherals.has(peripheral.id)) {
                bleManager.writeWithoutResponse(peripheral.id, this.serviceUUID, this.writeCharacteristic, data, 20, 30, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        fulfill();
                    }
                });
            }
            else {
                reject('未连接蓝牙设备');
            }
        });
    }

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

    connectAndStartNotification(peripheral) {
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
                            this.onHandleMessage('未发现characteristic')
                            return;
                        }
                        this.serviceUUID = peripheralInfo.services[0].uuid
                        this.startNotification(peripheral.id, peripheralInfo.services[0].uuid, this.readCharacteristic).then(() => {
                            peripheral.connected = true;
                            this.connectedPeripherals.set(peripheral.id, peripheral);
                            this.onHandleConnectStateChanged(peripheral);
                            this.currentReconnectTime = 0;

                        }).catch((err) => {
                            this.onHandleMessage("通知蓝牙characteristics异常:" + err);
                        });

                    }).catch((err) => {
                        this.onHandleMessage("检索蓝牙服务异常:" + err);
                    })
                }, 1000);

            }).catch((err) => {
                this.currentReconnectTime ++;
                setTimeout(()=>{this.connectAndStartNotification(peripheral);},2000);
            });
        }
        else {
            this.currentReconnectTime = 0;
        }

    }

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

    checkState() {
        bleManager.checkState();
    }

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

            //(ANDROID) Defaults to SCAN_MODE_LOW_POWER on android
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
