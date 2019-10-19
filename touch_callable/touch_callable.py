#!/usr/bin/env python3
import argparse
import datetime
import enum
import importlib.util
import inspect
import os
import sys
import typing

from flask import Flask, jsonify, request, send_file, send_from_directory

app = Flask(__name__)


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
        return default

    def is_support_signature(signature):
        for parameter in signature.parameters.values():
            if issubclass(parameter.annotation, enum.Enum) or issubclass(
                parameter.annotation, datetime.datetime
            ):
                return True
            if parameter.annotation not in (str, int, float, bool):
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


CALLABLES = None


@app.route("/callable")
def get_callable():
    global CALLABLES
    if not CALLABLES:
        CALLABLES = get_callable_from_module(MODULE)
    return jsonify(CALLABLES)


@app.route("/callable/<string:callable_name>", methods=["POST"])
def run_callable(callable_name):
    callable_ = getattr(MODULE, callable_name)

    type_casted_parameters = {}
    type_hints = typing.get_type_hints(callable_)
    for param_name, value in request.json.items():
        if value is None:
            type_casted_parameters[param_name] = value
            continue
        type_ = type_hints[param_name]
        if type_ is datetime.datetime:
            type_casted_parameters[param_name] = datetime.datetime.strptime(
                value, "%Y-%m-%dT%H:%M:%S.%fZ"
            )
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


def main():
    global MODULE
    parser = argparse.ArgumentParser(description="Touch Callables.")
    parser.add_argument("module_path", type=str, help="模块路径，支持绝对和相对路径")
    parser.add_argument("--port", type=int, default=6789, help="端口号")
    parser.add_argument("--debug", type=bool, default=False, help="是否开启 Flask 的调试模式")

    args = parser.parse_args()
    MODULE = load_module_by_path(args.module_path)
    app.run(debug=args.debug, port=args.port)


if __name__ == "__main__":
    main()
