import React, { Component } from 'react';
import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    TouchableHighlight,
    NativeAppEventEmitter,
    NativeEventEmitter,
    NativeModules,
    Platform,
    PermissionsAndroid,
    ListView,
    ScrollView,
    AppState,
    TextInput
} from 'react-native';
import Dimensions from 'Dimensions';
import BleManager from 'ut-smarthome-ble-manager';
import TimerMixin from 'react-timer-mixin';
import reactMixin from 'react-mixin';

const window = Dimensions.get('window');
const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export default class App extends Component {
    constructor(){
        super()

        this.state = {
            scanning:false,
            peripherals: new Map(),
            appState: '',
            // serviceUUID:'55540001-5554-0000-0055-4e4954454348',
            serviceUUID:'0000FF00-0000-1000-8000-00805F9B34FB'
        }

        this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
        this.handleStopScan = this.handleStopScan.bind(this);
        this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
        this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
        this.handleAppStateChange = this.handleAppStateChange.bind(this);
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);

        BleManager.start({showAlert: false});

        this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
        this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan );
        this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
        this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic );



        if (Platform.OS === 'android' && Platform.Version >= 23) {
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result) {
                    console.log("Permission is OK");
                } else {
                    PermissionsAndroid.requestPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                    if (result) {
                        console.log("User accept");
                    } else {
                        console.log("User refuse");
        }
        });
        }
        });
        }

    }

    handleAppStateChange(nextAppState) {
        if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
            console.warn('App has come to the foreground!')
            BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
                console.warn('Connected peripherals: ' + peripheralsArray.length);
        });
        }
        this.setState({appState: nextAppState});
    }

    componentWillUnmount() {
        this.handlerDiscover.remove();
        this.handlerStop.remove();
        this.handlerDisconnect.remove();
        this.handlerUpdate.remove();
    }

    handleDisconnectedPeripheral(data) {
        console.warn('', data)
        let peripherals = this.state.peripherals;
        let peripheral = peripherals.get(data.peripheral);
        if (peripheral) {
            peripheral.connected = false;
            peripherals.set(peripheral.id, peripheral);
            this.setState({peripherals});
        }
        console.log('Disconnected from ' + data.peripheral);
    }

    handleUpdateValueForCharacteristic(data) {
        console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
    }

    handleStopScan() {
        console.log('Scan is stopped');
        this.setState({ scanning: false });
    }

    async startScan() {
        if (!this.state.scanning) {
            this.setState({
                peripherals: new Map()
            })
            BleManager.scan([], 3, true).then((results) => {
                console.log('Scanning...');
            this.setState({scanning:true});
        });
        }
    }

    handleDiscoverPeripheral(peripheral){
        var peripherals = this.state.peripherals;
        if (!peripherals.has(peripheral.id)){
            console.warn('Got ble peripheral', peripheral);
            peripherals.set(peripheral.id, peripheral);
            this.setState({ peripherals })
        }
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

    connectDevice(peripheral) {
        if (peripheral) {
            if (peripheral.connected) {
                BleManager.disconnect(peripheral.id);
            } else {
                console.warn('', peripheral)
                BleManager.connect(peripheral.id).then(() => {
                    let peripherals = this.state.peripherals;
                    let p = peripherals.get(peripheral.id);
                    if (p) {
                        p.connected = true;
                        peripherals.set(peripheral.id, p);
                        this.setState({peripherals});
                    }
                    console.warn('Connected to ' + peripheral.id);

                    this.setTimeout(() => {
                        BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
                            console.warn('', peripheral);
                            console.warn('', peripheralInfo);
                            var service = this.state.serviceUUID;
                            var bakeCharacteristic = '55540001-5554-0001-0055-4E4954454348';
                            var crustCharacteristic = '55540001-5554-0002-0055-4E4954454348';

                            this.setTimeout(() => {
                                BleManager.startNotification(peripheral.id, service, bakeCharacteristic).then(() => {
                                    console.warn('Started notification on ' + peripheral.id);
                                    this.setTimeout(() => {
                                        BleManager.write(peripheral.id, service, crustCharacteristic, [0]).then(() => {
                                            console.warn('Writed NORMAL crust');
                                        });

                                    }, 500);
                                }).catch((error) => {
                                    console.warn('Notification error', error);
                                });
                            }, 200);
                        });

                    }, 900);
                }).catch((error) => {
                    console.warn('Connection error', error);
                });
            }
        }
    }

    render() {
        const list = Array.from(this.state.peripherals.values());
        const dataSource = ds.cloneWithRows(list);


        return (
            <View style={styles.container}>
    <TextInput
        style={styles.sceneName}
        value={this.state.serviceUUID}
        placeholder="serviceUUID"
        placeholderTextColor="#999"
        onChangeText={(text) => this.setState({serviceUUID:text})}
        underlineColorAndroid='transparent'
            />
            <TouchableHighlight style={{marginTop: 40,margin: 20, padding:20, backgroundColor:'#ccc'}} onPress={() => this.startScan() }>
    <Text>搜索蓝牙设备 ({this.state.scanning ? 'on' : 'off'})</Text>
        </TouchableHighlight>
        <ScrollView style={styles.scroll}>
        {(list.length == 0) &&
        <View style={{flex:1, margin: 20}}>
        <Text style={{textAlign: 'center'}}>未发现蓝牙设备</Text>
        </View>
        }
    <ListView
        enableEmptySections={true}
        dataSource={dataSource}
        renderRow={(item) => {
            const color = item.connected ? 'green' : '#fff';
            return (
                    item.name != null ?
                <TouchableHighlight onPress={() => this.connectDevice(item) }>
        <View style={[styles.row, {backgroundColor: color}]}>
        <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>名称：{item.name}</Text>
            {Platform.OS === 'android'?
                item.advertising.bytes != null ?<Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>广播包：{this.bytesToLogString(item.advertising.bytes)}</Text>
                :null
             : item.advertising.kCBAdvDataManufacturerData.bytes != null ?<Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>广播包：{this.bytesToLogString(item.advertising.bytes)}</Text>
                    :null }

            <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>mac地址：{item.id}</Text>
            </View>
            </TouchableHighlight> : null
        );
        }}
        />
        </ScrollView>
        </View>
    );
    }
}
reactMixin(App.prototype, TimerMixin);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
        width: window.width,
        height: window.height,
        paddingTop: 10
    },
    scroll: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        margin: 10,
    },
    row: {
        margin: 10
    },
    sceneName: {
        marginLeft: 15,
        marginTop: 15,
        marginRight: 15,
        borderWidth: 1,
        borderRadius: 8,
        paddingLeft: 30,
        paddingRight: 10,
        paddingTop: 5,
        paddingBottom: 5,
        borderColor: '#ddd',
    },
});
