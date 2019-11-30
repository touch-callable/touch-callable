<p align="center">
  <img width="200" src="./touch-callable.svg">
</p>

<h1 align="center">Touch-Callable</h1>

<p align="center">
  <image src="https://img.shields.io/pypi/v/touch-callable.svg" />
  <image src="https://img.shields.io/pypi/dm/touch-callable.svg" />
</p>

面向非严肃 Web 应用
自动为 Python 函数生成 Web 界面

[English](./README.md) | 简体中文

### 支持的平台

- macOS
- Ubuntu
- Windows

## 安装

仅支持 Python 3.6 及以上版本，推荐在虚拟环境下使用。

`pip install -U touch-callable`

## 支持的函数参数类型

- str
- int
- float
- bool
- datetime.datetime
- datetime.date
- datetime.time
- enum.Enum
- io.BytesIO
- typing.BinaryIO

## 命令行参数

#### `--host` 指定监听的主机

默认为：172.0.0.1 也就是仅本机能访问。

如果希望监听所有网段：

`$ touch-callable example.py --host 0.0.0.0`

#### `--port` 指定监听的端口

默认为：6789。

#### `--debug` 是否开启 Flask 调试功能（正常使用不建议开启）

默认关闭，如果希望开启

`$ touch-callable example.py --debug True`

## 示例

### 所有支持的函数参数

```python
# example.py
from datetime import datetime, date, time
from enum import Enum
import io
import typing


class Languages(Enum):
  Python = 'Python'
  PHP = 'PHP'
  Java = 'Java'


def demo(int_: int, str_: str, float_: float, bool_: bool,
         enum_: Languages,
         datetime_: datetime = datetime.now(),
         date_: date = date.today(),
         time_: time = time(1, 2, 3),
         bytes_io: io.BytesIO = None,
         binary_io: typing.BinaryIO = None):
  pass
```

`$ touch-callable example.py`

![demo](https://raw.githubusercontent.com/pengwk/touch-callable/master/new_demo_all_args.png)

响应式 UI：

![demo_with_reponsive_ui](https://raw.githubusercontent.com/pengwk/touch-callable/master/demo_all_args_with_reponsive_ui.png)

## 常见问题

#### 命令未找到 Command not found

如果在 Ubuntu 中直接使用 `pip3 install touch-callable` 安装，会导致这个错误，推荐使用虚拟环境。

也可以使用 `$ python3 -m touch_callable.touch_callable example.py` 运行。



