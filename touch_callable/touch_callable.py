#!/usr/bin/env python3
import argparse
import datetime
import enum
import importlib.util
import inspect
import os
import sys
import typing
import json
import time
import io

from flask import Flask, jsonify, request, send_file, send_from_directory


app = Flask(__name__)


CALLABLES = None
HAS_NEW_MODULE = False
MODULE_PATH = None
LOCALE = "en"
KEEP_WATCHING = True


@app.route("/")
def home():
    return send_file("./front-end/build/index.html")


@app.route("/static/css/<path:filename>")
def serve_css(filename):
    return send_from_directory("./front-end/build/static/css/", filename)


@app.route("/static/js/<path:filename>")
def serve_js(filename):
    return send_from_directory("./front-end/build/static/js/", filename)


@app.route("/manifest.json")
def serve_manifest():
    return send_file("./front-end/build/manifest.json")


@app.route("/favicon.ico")
def serve_favicon():
    return send_file("./front-end/build/favicon.ico")


@app.route("/logo192.png")
def serve_logo192():
    return send_file("./front-end/build/logo192.png")


@app.route("/logo512.png")
def serve_logo512():
    return send_file("./front-end/build/logo512.png")


def get_callable_from_module(module):
    def annotation_name_or_none(annotation):
        if annotation != inspect._empty:
            return annotation.__name__

    def get_parameter_annotation(annotation):
        if issubclass(annotation, enum.Enum):
            return "Enum"
        return annotation_name_or_none(annotation)

    def get_default_value(default):
        if default == inspect._empty:
            return None
        if isinstance(default, enum.Enum):
            return default.value
        if isinstance(default, (datetime.date, datetime.datetime)):
            return default.isoformat()
        if isinstance(default, datetime.time):
            return default.replace(microsecond=0).isoformat()
        return default

    def is_support_signature(signature):

        for parameter in signature.parameters.values():

            if issubclass(parameter.annotation, enum.Enum):
                return True
            if parameter.annotation not in (
                str,
                int,
                float,
                bool,
                datetime.datetime,
                datetime.date,
                datetime.time,
                io.BytesIO,
                typing.BinaryIO
            ):
                return False
            if parameter.kind in (
                inspect.Parameter.VAR_KEYWORD,
                inspect.Parameter.VAR_POSITIONAL,
            ):
                return False
        return True

    def is_required_parameter(parameter):
        if parameter.default == inspect._empty:
            return True
        return False

    def get_enum_values(annotation):
        if issubclass(annotation, enum.Enum):
            return [e.value for e in annotation]

    data = []
    for callable_name, callable_ in inspect.getmembers(module, inspect.isfunction):
        if callable_.__module__ != module.__name__:
            continue

        full_doc = inspect.getdoc(callable_)
        signature = inspect.signature(callable_)
        if not is_support_signature(signature):
            continue
        data.append(
            {
                "callable_name": callable_name,
                "title": full_doc.split()[0] if full_doc else "",
                "doc": full_doc,
                "source_code": inspect.getsource(callable_),
                "return_type": annotation_name_or_none(signature.return_annotation),
                "parameters": [
                    {
                        "default": get_default_value(parameter.default),
                        "kind": parameter.kind.name,
                        "required": is_required_parameter(parameter),
                        "name": name,
                        "annotation": get_parameter_annotation(parameter.annotation),
                        "enum_values": get_enum_values(parameter.annotation),
                    }
                    for name, parameter in signature.parameters.items()
                ],
            }
        )
    return data


def is_required(callable_name, param_name):
    global CALLABLES
    for callable_info in CALLABLES:
        if callable_info['callable_name'] == callable_name:
            for param_info in callable_info['parameters']:
                if param_info['name'] == param_name:
                    return param_info['required']


@app.route("/module-status", methods=["GET"])
def module_status():
    global HAS_NEW_MODULE
    return {"has_new": HAS_NEW_MODULE}


@app.route("/reload-module", methods=["POST"])
def reload_module():
    global MODULE
    global MODULE_PATH
    global HAS_NEW_MODULE
    global CALLABLES

    MODULE = load_module_by_path(MODULE_PATH)
    HAS_NEW_MODULE = False
    CALLABLES = None

    return {"status": "ok"}


@app.route("/callable")
def get_callable():
    global CALLABLES
    if not CALLABLES:
        CALLABLES = get_callable_from_module(MODULE)
    return jsonify(CALLABLES)


@app.route("/locale", methods=["GET", "POST"])
def get_locale():
    global LOCALE
    if request.method == "GET":
        return {"locale": LOCALE}
    else:
        LOCALE = request.json["locale"]
        return {"locale": LOCALE}


@app.route("/callable/<string:callable_name>", methods=["POST"])
def run_callable(callable_name):
    callable_ = getattr(MODULE, callable_name)

    if request.form:
        data = json.loads(request.form['json'])
        for param_name, file in request.files.items():
            # ByteIO
            data[param_name] = file.stream._file
    else:
        data = request.json

    type_casted_parameters = {}
    type_hints = typing.get_type_hints(callable_)
    for param_name, value in data.items():
        type_ = type_hints[param_name]
        if type_ in (io.BytesIO, typing.BinaryIO):
            if not value and not is_required(callable_name, param_name):
                continue
            type_casted_parameters[param_name] = value
            continue

        if value is None:
            type_casted_parameters[param_name] = value
            continue

        if type_ is datetime.datetime:
            type_casted_parameters[param_name] = datetime.datetime.strptime(
                value, "%Y-%m-%dT%H:%M:%S.%fZ"
            )
            continue

        if type_ is datetime.date:
            type_casted_parameters[param_name] = datetime.datetime.strptime(
                value, "%Y-%m-%dT%H:%M:%S.%fZ"
            ).date()
            continue

        if type_ is datetime.time:
            type_casted_parameters[param_name] = datetime.datetime.strptime(
                value, "%Y-%m-%dT%H:%M:%S.%fZ"
            ).time()
            continue

        if type_.__class__ == typing.Union.__class__:
            for possible_type in type_.__args__:
                if possible_type is not type(None):
                    try:
                        type_casted_parameters[param_name] = possible_type(value)
                    except:
                        pass
            continue
        type_casted_parameters[param_name] = type_(value)

    status = "success"
    try:
        result = callable_(**type_casted_parameters)
    except Exception as e:
        status = "fail"
        result = str(e)
    return jsonify({"status": status, "result": result})


def load_module_by_path(path):
    abspath = os.path.abspath(path)
    if not os.path.exists(abspath):
        raise ValueError("文件不存在！")

    sys.path.insert(0, os.getcwd())
    module_name = os.path.splitext(os.path.basename(abspath))[0]
    spec = importlib.util.spec_from_file_location(module_name, abspath)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _iter_module_files():
    """This iterates over all relevant Python files.  It goes through all
    loaded files from modules, all files in folders of already loaded modules
    as well as all files reachable through a package.
    """
    global MODULE
    # The list call is necessary on Python 3 in case the module
    # dictionary modifies during iteration.

    for module in list(sys.modules.values()) + [MODULE]:
        if module is None:
            continue
        filename = getattr(module, "__file__", None)
        if filename:
            if os.path.isdir(filename) and os.path.exists(
                os.path.join(filename, "__init__.py")
            ):
                filename = os.path.join(filename, "__init__.py")

            old = None
            while not os.path.isfile(filename):
                old = filename
                filename = os.path.dirname(filename)
                if filename == old:
                    break
            else:
                if filename[-4:] in (".pyc", ".pyo"):
                    filename = filename[:-1]
                yield filename


def watch_module():
    global MODULE_PATH, MODULE, HAS_NEW_MODULE
    global KEEP_WATCHING

    from itertools import chain

    mtimes = {}
    while 1 and KEEP_WATCHING:
        for filename in chain(_iter_module_files()):
            try:
                mtime = os.stat(filename).st_mtime
            except OSError:
                continue

            old_time = mtimes.get(filename)
            if old_time is None:
                mtimes[filename] = mtime
                continue
            elif mtime > old_time:
                HAS_NEW_MODULE = True
                mtimes = {}
        time.sleep(1)


def main():
    global MODULE, MODULE_PATH, KEEP_WATCHING
    parser = argparse.ArgumentParser(description="Touch Callables.")
    parser.add_argument("module_path", type=str, help="模块路径，支持绝对和相对路径")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="监听 IP 地址")
    parser.add_argument("--port", type=int, default=6789, help="端口号")
    parser.add_argument("--debug", type=bool, default=False, help="是否开启 Flask 的调试模式")

    args = parser.parse_args()
    MODULE_PATH = args.module_path
    MODULE = load_module_by_path(args.module_path)

    import threading

    t = threading.Thread(target=watch_module)
    t.start()

    app.run(host=args.host, debug=args.debug, port=args.port)
    KEEP_WATCHING = False
    t.join()


if __name__ == "__main__":
    main()
