<p align="center">
  <img width="200" src="./touch-callable.svg">
</p>

<h1 align="center">Touch-Callable</h1>
<p align="center">
  <image src="https://img.shields.io/pypi/v/touch-callable.svg" />
  <image src="https://img.shields.io/pypi/dm/touch-callable.svg" />
</p>

<p>
The web framework for less serious application.

Automatically generate a Web UI for Python function using type annotations.
<p>

English | [简体中文](./README_zh_CN.md)

## Support platforms

- macOS
- Ubuntu
- Windows

## Installation

Only support Python 3.6!

`pip install -U touch-callable`

## Support types

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

## CommandLine args

#### `--host` 

Default is 127.0.0.1, you can only visit it on your computer.

If you want to listen all networks：

`$ touch-callable example.py --host 0.0.0.0`

#### `--port` 

Default is 6789.

#### `--debug` enable Flask debug feature(not recommend)

Default is False, if you want to enable it

`$ touch-callable example.py --debug True`

## Screenshot

#### callables

![callables](https://raw.githubusercontent.com/pengwk/touch-callable/master/callables_en_us.png)

## Examples

### All support types

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

![demo_with_reponsive_ui](https://raw.githubusercontent.com/pengwk/touch-callable/master/demo_all_args_with_responsive_ui_en_us.png)

## Stargazers

[![Stargazers over time](https://starchart.cc/pengwk/touch-callable.svg)](https://starchart.cc/pengwk/touch-callable)
