/**
 * Web Bluetooth 心率服务
 * 用于连接支持标准蓝牙心率服务的智能手表
 */

// 蓝牙类型定义
interface BluetoothDevice {
  name: string | null;
  gatt: BluetoothRemoteGATTServer | null;
  addEventListener: (event: string, listener: () => void) => void;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect: () => Promise<BluetoothRemoteGATTServer>;
  disconnect: () => void;
  getPrimaryService: (service: string) => Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic: (characteristic: string) => Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  startNotifications: () => Promise<void>;
  stopNotifications: () => Promise<void>;
  addEventListener: (event: string, listener: (event: { target: { value: DataView } }) => void) => void;
}

interface BluetoothAPI {
  requestDevice: (options: {
    filters: Array<{ services: string[] }>;
    optionalServices?: string[];
  }) => Promise<BluetoothDevice>;
}

export interface BluetoothServiceCallbacks {
  onHeartRate: (heartRate: number, timestamp: number) => void;
  onConnected: (deviceName: string) => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
}

export class BluetoothHeartRateService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isMonitoring = false;
  private callbacks: BluetoothServiceCallbacks | null = null;

  // 心率服务UUID（标准）
  private static readonly HEART_RATE_SERVICE_UUID = 'heart_rate';
  private static readonly HEART_RATE_MEASUREMENT_UUID = 'heart_rate_measurement';

  /**
   * 检查浏览器是否支持蓝牙
   */
  private static checkBluetoothSupport(): BluetoothAPI {
    const navigatorWithBluetooth = navigator as Navigator & { bluetooth: BluetoothAPI };
    if (!navigatorWithBluetooth.bluetooth) {
      throw new Error('您的浏览器不支持Web Bluetooth API，请使用Chrome或Edge浏览器');
    }
    return navigatorWithBluetooth.bluetooth;
  }

  /**
   * 连接蓝牙设备
   */
  async connect(callbacks: BluetoothServiceCallbacks): Promise<void> {
    // 检查浏览器支持
    const bluetooth = BluetoothHeartRateService.checkBluetoothSupport();

    this.callbacks = callbacks;

    try {
      // 扫描并请求连接设备
      this.device = await bluetooth.requestDevice({
        filters: [{ services: [BluetoothHeartRateService.HEART_RATE_SERVICE_UUID] }],
        optionalServices: [BluetoothHeartRateService.HEART_RATE_SERVICE_UUID]
      });

      console.log('设备名称:', this.device.name);

      // 监听设备断开
      this.device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect();
      });

      // 连接到GATT服务器
      const server = await this.device.gatt!.connect();
      console.log('已连接到GATT服务器');

      // 获取心率服务
      const service = await server.getPrimaryService(BluetoothHeartRateService.HEART_RATE_SERVICE_UUID);
      console.log('已获取心率服务');

      // 获取心率测量特征值
      this.characteristic = await service.getCharacteristic(
        BluetoothHeartRateService.HEART_RATE_MEASUREMENT_UUID
      );
      console.log('已获取心率测量特征值');

      // 开始监听数据
      await this.startNotifications();

      // 通知回调
      if (this.callbacks?.onConnected) {
        this.callbacks.onConnected(this.device.name || '未知设备');
      }

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error('连接设备失败:', error);
      if (this.callbacks?.onError) {
        this.callbacks.onError(errorMessage);
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * 开始监听心率数据
   */
  private async startNotifications(): Promise<void> {
    if (!this.characteristic) {
      throw new Error('特征值未初始化');
    }

    await this.characteristic.startNotifications();

    this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target.value as DataView;
      const heartRate = this.parseHeartRate(value);

      if (heartRate !== null && this.callbacks?.onHeartRate) {
        this.callbacks.onHeartRate(heartRate, Date.now());
      }
    });

    this.isMonitoring = true;
    console.log('开始监听心率数据');
  }

  /**
   * 停止监听
   */
  async stopMonitoring(): Promise<void> {
    if (this.characteristic) {
      try {
        await this.characteristic.stopNotifications();
      } catch (error) {
        console.error('停止通知失败:', error);
      }
    }

    this.handleDisconnect();
  }

  /**
   * 处理设备断开
   */
  private handleDisconnect(): void {
    this.isMonitoring = false;
    if (this.device && this.device.gatt?.connected) {
      try {
        this.device.gatt.disconnect();
      } catch (error) {
        console.error('断开连接失败:', error);
      }
    }

    if (this.callbacks?.onDisconnected) {
      this.callbacks.onDisconnected();
    }
  }

  /**
   * 解析心率数据
   * 蓝牙心率测量格式参考: https://www.bluetooth.com/specifications/specs/
   */
  private parseHeartRate(data: DataView): number | null {
    // 第一个字节包含标志位
    const flags = data.getUint8(0);

    // 检查心率值是16位还是8位
    const is16Bit = (flags & 0x01) === 0x01;

    try {
      if (is16Bit) {
        // 16位心率值（小端序）
        return data.getUint16(1, true);
      } else {
        // 8位心率值
        return data.getUint8(1);
      }
    } catch (error) {
      console.error('解析心率数据失败:', error);
      return null;
    }
  }

  /**
   * 获取友好的错误信息
   */
  private getErrorMessage(error: unknown): string {
    const errorObj = error as { name?: string; message?: string };
    if (errorObj.name === 'NotFoundError') {
      return '未找到支持心率服务的设备，请确保您的设备已开启蓝牙并支持心率监测';
    } else if (errorObj.name === 'NetworkError') {
      return '蓝牙连接失败，请检查设备是否已连接其他应用';
    } else if (errorObj.name === 'SecurityError') {
      return '权限被拒绝，请允许浏览器访问蓝牙设备';
    } else if (errorObj.message) {
      return errorObj.message;
    }
    return '未知错误';
  }

  /**
   * 检查是否正在监听
   */
  isConnected(): boolean {
    return this.isMonitoring && this.device?.gatt?.connected === true;
  }

  /**
   * 获取设备名称
   */
  getDeviceName(): string | null {
    return this.device?.name || null;
  }
}
