# Touch-Callable

The web framework for less serious application.

Auto generat Web UI for Python Functions.

## Support platforms

macOS

# Installing

Only support Python 3.6!

`pip install -U touch-callable`

# Example

```python
# examply.py
from enum import Enum


class 开关(Enum):
  开 = '开'
  关 = '关'


def 饮水机(口令: str, 制热: 开关=None, 制冷: 开关=开关('开')):
  """这是 20618 的！"""
  if 口令 != '多喝热水':
    raise ValueError('你是谁，我不认识你')

  # 省略具体逻辑
```

`$ touch-callable example.py`

![demo](./demo.png)


