"""Browser-compatible Python turtle module for TurtleQuest (Python 3.9+)."""

import math
import sys

MAX_COMMANDS = 25000

__all__ = [
    "Turtle",
    "Screen",
    "TurtleLimitError",
    "forward", "fd",
    "backward", "bk", "back",
    "right", "rt",
    "left", "lt",
    "goto", "setpos", "setposition",
    "setx", "sety", "home",
    "setheading", "seth",
    "circle",
    "penup", "pu", "up",
    "pendown", "pd", "down",
    "isdown",
    "pensize", "width",
    "pencolor", "fillcolor", "color",
    "begin_fill", "end_fill", "filling",
    "dot", "stamp", "write",
    "hideturtle", "ht",
    "showturtle", "st",
    "isvisible",
    "clear", "reset",
    "speed", "shape",
    "position", "pos", "xcor", "ycor", "heading",
    "distance", "towards",
    "bgcolor", "colormode", "clearscreen", "resetscreen",
    "tracer", "update", "setup", "title", "bye",
    "mainloop", "done", "exitonclick",
]


class TurtleLimitError(RuntimeError):
    """Raised when student code emits too many turtle commands (e.g. infinite loop)."""


_NAMED_COLORS = {
    "black": "#1e293b",
    "white": "#ffffff",
    "red": "#ef4444",
    "green": "#22c55e",
    "blue": "#3b82f6",
    "yellow": "#eab308",
    "orange": "#f97316",
    "purple": "#a855f7",
    "pink": "#ec4899",
    "cyan": "#06b6d4",
    "teal": "#14b8a6",
    "lime": "#84cc16",
    "brown": "#92400e",
    "gray": "#64748b",
    "grey": "#64748b",
    "gold": "#f59e0b",
    "navy": "#1e3a8a",
    "skyblue": "#38bdf8",
    "coral": "#fb7185",
    "magenta": "#d946ef",
    "indigo": "#6366f1",
    "violet": "#8b5cf6",
    "turquoise": "#2dd4bf",
    "darkgreen": "#15803d",
    "darkblue": "#1d4ed8",
    "darkred": "#b91c1c",
    "lightblue": "#7dd3fc",
    "lightgreen": "#86efac",
    "silver": "#cbd5e1",
}

_state = {
    "commands": [],
    "segments": [],
    "bgcolor": "#ffffff",
    "colormode": 1.0,
    "turtles": {},
    "default_turtle": None,
    "next_id": 1,
    "next_group": 1,
    "flushed_index": 0,
}


def _reset_runtime():
    _state["commands"] = []
    _state["segments"] = []
    _state["bgcolor"] = "#ffffff"
    _state["colormode"] = 1.0
    _state["turtles"] = {}
    _state["default_turtle"] = None
    _state["next_id"] = 1
    _state["next_group"] = 1
    _state["flushed_index"] = 0


def _get_user_line():
    try:
        frame = sys._getframe(1)
    except Exception:
        return None
    while frame is not None:
        if frame.f_code.co_filename == "<user_code>":
            return frame.f_lineno
        frame = frame.f_back
    return None


def _record(cmd, **kwargs):
    if len(_state["commands"]) >= MAX_COMMANDS:
        raise TurtleLimitError(
            "Your turtle ran more than 25,000 steps! Check if a loop is repeating forever."
        )
    entry = {"cmd": cmd, "line": _get_user_line()}
    entry.update(kwargs)
    _state["commands"].append(entry)
    return entry


def _normalize_color(*args):
    if len(args) == 0:
        return None
    if len(args) == 1:
        val = args[0]
        if isinstance(val, (tuple, list)):
            args = tuple(val)
        elif isinstance(val, str):
            cleaned = val.strip()
            low = cleaned.lower()
            if low in _NAMED_COLORS:
                return _NAMED_COLORS[low]
            return cleaned
        else:
            raise TypeError("Color must be a name like 'blue', hex '#ff0000', or (r, g, b).")

    if len(args) == 3:
        r, g, b = args
        # Auto-support 0-255 values smoothly even if colormode(255) wasn't called
        if _state["colormode"] == 255 or any(float(c) > 1.0 for c in (r, g, b)):
            ri = max(0, min(255, int(round(float(r)))))
            gi = max(0, min(255, int(round(float(g)))))
            bi = max(0, min(255, int(round(float(b)))))
        else:
            ri = max(0, min(255, int(round(float(r) * 255))))
            gi = max(0, min(255, int(round(float(g) * 255))))
            bi = max(0, min(255, int(round(float(b) * 255))))
        return f"#{ri:02x}{gi:02x}{bi:02x}"

    raise TypeError("Expected 1 color string or 3 (r, g, b) numbers.")


class Turtle:
    """Interactive Turtle graphics actor."""

    def __init__(self, shape="turtle"):
        tid = f"t{_state['next_id']}"
        _state["next_id"] += 1
        self._id = tid
        self._x = 0.0
        self._y = 0.0
        self._heading = 0.0
        self._pen_down = True
        self._pen_color = "#1e293b"
        self._fill_color = "#1cb0f6"
        self._pen_size = 3.0
        self._visible = True
        self._filling = False
        self._fill_points = []
        self._speed = 6
        self._shape = shape
        _state["turtles"][tid] = self
        _record(
            "spawn",
            id=self._id,
            x=0.0,
            y=0.0,
            heading=0.0,
            penDown=True,
            penColor=self._pen_color,
            fillColor=self._fill_color,
            penSize=self._pen_size,
            visible=True,
        )

    def _move_to(self, nx, ny, line_override=None, group=None):
        ox, oy = self._x, self._y
        self._x = float(nx)
        self._y = float(ny)
        line = line_override if line_override is not None else _get_user_line()

        if self._filling:
            self._fill_points.append([self._x, self._y])

        if self._pen_down:
            _state["segments"].append(
                {
                    "x1": ox,
                    "y1": oy,
                    "x2": self._x,
                    "y2": self._y,
                    "color": self._pen_color,
                    "width": self._pen_size,
                    "line": line,
                    "turtle_id": self._id,
                }
            )

        if len(_state["commands"]) >= MAX_COMMANDS:
            raise TurtleLimitError(
                "Your turtle ran more than 25,000 steps! Check if a loop is repeating forever."
            )
        cmd_obj = {
            "cmd": "move",
            "id": self._id,
            "line": line,
            "x1": ox,
            "y1": oy,
            "x2": self._x,
            "y2": self._y,
            "penDown": self._pen_down,
            "color": self._pen_color,
            "width": self._pen_size,
        }
        if group is not None:
            cmd_obj["group"] = group
        _state["commands"].append(cmd_obj)

    def _turn_by(self, delta_deg, line_override=None, group=None):
        old_h = self._heading
        self._heading = (self._heading + float(delta_deg)) % 360.0
        line = line_override if line_override is not None else _get_user_line()
        if len(_state["commands"]) >= MAX_COMMANDS:
            raise TurtleLimitError(
                "Your turtle ran more than 25,000 steps! Check if a loop is repeating forever."
            )
        cmd_obj = {
            "cmd": "turn",
            "id": self._id,
            "line": line,
            "fromHeading": old_h,
            "toHeading": self._heading,
            "delta": float(delta_deg),
        }
        if group is not None:
            cmd_obj["group"] = group
        _state["commands"].append(cmd_obj)

    def forward(self, distance):
        dist = float(distance)
        rad = math.radians(self._heading)
        nx = self._x + dist * math.cos(rad)
        ny = self._y + dist * math.sin(rad)
        self._move_to(nx, ny)

    fd = forward

    def backward(self, distance):
        self.forward(-float(distance))

    bk = backward
    back = backward

    def right(self, angle):
        self._turn_by(-float(angle))

    rt = right

    def left(self, angle):
        self._turn_by(float(angle))

    lt = left

    def goto(self, x, y=None):
        if y is None:
            if isinstance(x, (tuple, list)):
                if len(x) != 2:
                    raise TypeError("goto() sequence must have 2 numbers (x, y).")
                nx, ny = float(x[0]), float(x[1])
            else:
                raise TypeError("Turtle.goto() missing 1 required positional argument: 'y'")
        else:
            nx, ny = float(x), float(y)
        self._move_to(nx, ny)

    setpos = goto
    setposition = goto

    def setx(self, x):
        self._move_to(float(x), self._y)

    def sety(self, y):
        self._move_to(self._x, float(y))

    def home(self):
        self._move_to(0.0, 0.0)
        self.setheading(0.0)

    def setheading(self, to_angle):
        target = float(to_angle) % 360.0
        delta = (target - self._heading + 540.0) % 360.0 - 180.0
        self._turn_by(delta)

    seth = setheading

    def circle(self, radius, extent=None, steps=None):
        radius = float(radius)
        if extent is None:
            extent = 360.0
        else:
            extent = float(extent)

        if steps is None:
            frac = abs(extent) / 360.0
            steps = 1 + int(min(11 + abs(radius) / 6.0, 59.0) * frac)
            steps = max(steps, 1)
        else:
            steps = max(1, int(steps))

        w = extent / steps
        w2 = 0.5 * w
        l = 2.0 * radius * math.sin(math.radians(w2))
        if radius < 0:
            l, w, w2 = -l, -w, -w2

        line = _get_user_line()
        gid = f"g{_state['next_group']}"
        _state["next_group"] += 1
        self._turn_by(w2, line_override=line, group=gid)
        for _ in range(steps):
            rad = math.radians(self._heading)
            nx = self._x + l * math.cos(rad)
            ny = self._y + l * math.sin(rad)
            self._move_to(nx, ny, line_override=line, group=gid)
            self._turn_by(w, line_override=line, group=gid)
        self._turn_by(-w2, line_override=line, group=gid)

    def penup(self):
        self._pen_down = False
        _record("pen", id=self._id, penDown=False)

    pu = penup
    up = penup

    def pendown(self):
        self._pen_down = True
        _record("pen", id=self._id, penDown=True)

    pd = pendown
    down = pendown

    def isdown(self):
        return self._pen_down

    def pensize(self, width=None):
        if width is None:
            return self._pen_size
        self._pen_size = max(0.5, float(width))
        _record("pensize", id=self._id, width=self._pen_size)
        return self._pen_size

    width = pensize

    def pencolor(self, *args):
        if not args:
            return self._pen_color
        self._pen_color = _normalize_color(*args)
        _record("pencolor", id=self._id, color=self._pen_color)
        return self._pen_color

    def fillcolor(self, *args):
        if not args:
            return self._fill_color
        self._fill_color = _normalize_color(*args)
        _record("fillcolor", id=self._id, color=self._fill_color)
        return self._fill_color

    def color(self, *args):
        if not args:
            return (self._pen_color, self._fill_color)
        if len(args) == 1:
            c = _normalize_color(args[0])
            self._pen_color = c
            self._fill_color = c
        elif len(args) == 2:
            self._pen_color = _normalize_color(args[0])
            self._fill_color = _normalize_color(args[1])
        elif len(args) == 3:
            c = _normalize_color(*args)
            self._pen_color = c
            self._fill_color = c
        else:
            raise TypeError("color() takes 1, 2, or 3 arguments.")
        _record("pencolor", id=self._id, color=self._pen_color)
        _record("fillcolor", id=self._id, color=self._fill_color)

    def begin_fill(self):
        self._filling = True
        self._fill_points = [[self._x, self._y]]
        _record("begin_fill", id=self._id, x=self._x, y=self._y)

    def end_fill(self):
        if self._filling and len(self._fill_points) >= 3:
            _record(
                "end_fill",
                id=self._id,
                points=[list(pt) for pt in self._fill_points],
                color=self._fill_color,
            )
        self._filling = False
        self._fill_points = []

    def filling(self):
        return self._filling

    def dot(self, size=None, *color_args):
        if size is not None and (isinstance(size, bool) or not isinstance(size, (int, float))):
            color_args = (size,) + color_args
            size = None
        dot_size = float(size) if size is not None else max(self._pen_size + 4.0, self._pen_size * 2.0)
        dot_color = _normalize_color(*color_args) if color_args else self._pen_color
        _record("dot", id=self._id, x=self._x, y=self._y, size=dot_size, color=dot_color)

    def stamp(self):
        _record(
            "stamp",
            id=self._id,
            x=self._x,
            y=self._y,
            heading=self._heading,
            color=self._pen_color,
        )

    def write(self, arg, move=False, align="left", font=("Arial", 14, "normal")):
        size = 14
        family = "sans-serif"
        weight = "normal"
        if isinstance(font, (tuple, list)):
            if len(font) >= 1:
                family = str(font[0])
            if len(font) >= 2:
                size = int(font[1])
            if len(font) >= 3:
                weight = str(font[2])
        text_str = str(arg)
        align_clean = str(align).lower()
        if align_clean not in ("left", "center", "right"):
            align_clean = "left"
        _record(
            "write",
            id=self._id,
            x=self._x,
            y=self._y,
            text=text_str,
            align=align_clean,
            color=self._pen_color,
            fontSize=size,
            fontFamily=family,
            fontWeight=weight,
        )
        if move and text_str:
            width_est = len(text_str) * size * 0.6
            dx = width_est / 2.0 if align_clean == "center" else (0.0 if align_clean == "right" else width_est)
            if dx:
                ox = self._x
                self._x += dx
                _record(
                    "move",
                    id=self._id,
                    x1=ox,
                    y1=self._y,
                    x2=self._x,
                    y2=self._y,
                    penDown=False,
                    color=self._pen_color,
                    width=self._pen_size,
                )

    def getscreen(self):
        return Screen()

    def hideturtle(self):
        self._visible = False
        _record("visibility", id=self._id, visible=False)

    ht = hideturtle

    def showturtle(self):
        self._visible = True
        _record("visibility", id=self._id, visible=True)

    st = showturtle

    def isvisible(self):
        return self._visible

    def clear(self):
        _state["segments"] = [s for s in _state["segments"] if s["turtle_id"] != self._id]
        _record("clear", id=self._id)

    def reset(self):
        self.clear()
        self._x = 0.0
        self._y = 0.0
        self._heading = 0.0
        self._pen_down = True
        self._pen_color = "#1e293b"
        self._fill_color = "#1cb0f6"
        self._pen_size = 3.0
        self._visible = True
        self._filling = False
        self._fill_points = []
        _record("reset", id=self._id)

    def speed(self, speed=None):
        if speed is None:
            return self._speed
        self._speed = speed
        return self._speed

    def shape(self, name=None):
        if name is None:
            return self._shape
        self._shape = str(name)
        return self._shape

    def position(self):
        return (round(self._x, 6), round(self._y, 6))

    pos = position

    def xcor(self):
        return round(self._x, 6)

    def ycor(self):
        return round(self._y, 6)

    def heading(self):
        return round(self._heading, 6)

    def distance(self, x, y=None):
        if y is None and isinstance(x, Turtle):
            tx, ty = x._x, x._y
        elif y is None and isinstance(x, (tuple, list)):
            tx, ty = float(x[0]), float(x[1])
        else:
            tx, ty = float(x), float(y)
        return math.hypot(tx - self._x, ty - self._y)

    def towards(self, x, y=None):
        if y is None and isinstance(x, Turtle):
            tx, ty = x._x, x._y
        elif y is None and isinstance(x, (tuple, list)):
            tx, ty = float(x[0]), float(x[1])
        else:
            tx, ty = float(x), float(y)
        return math.degrees(math.atan2(ty - self._y, tx - self._x)) % 360.0


class Screen:
    """Browser-compatible Turtle Screen."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def bgcolor(self, *args):
        if not args:
            return _state["bgcolor"]
        _state["bgcolor"] = _normalize_color(*args)
        _record("bgcolor", color=_state["bgcolor"])
        return _state["bgcolor"]

    def colormode(self, cmode=None):
        if cmode is None:
            return _state["colormode"]
        if cmode in (1, 1.0, 255):
            _state["colormode"] = float(cmode) if cmode == 1 else cmode
        else:
            raise ValueError("colormode must be 1.0 or 255.")
        return _state["colormode"]

    def title(self, titlestring):
        return None

    def setup(self, width=None, height=None, startx=None, starty=None):
        return None

    def tracer(self, n=None, delay=None):
        return None

    def update(self):
        return None

    def clear(self):
        _state["segments"] = []
        _record("clear", id="all")

    clearscreen = clear

    def reset(self):
        _state["segments"] = []
        _state["bgcolor"] = "#ffffff"
        for t in _state["turtles"].values():
            t._x = 0.0
            t._y = 0.0
            t._heading = 0.0
            t._pen_down = True
            t._pen_color = "#1e293b"
            t._fill_color = "#1cb0f6"
            t._pen_size = 3.0
            t._visible = True
            t._filling = False
            t._fill_points = []
        _record("reset_screen", id="all")

    resetscreen = reset

    def exitonclick(self):
        return None

    def mainloop(self):
        return None

    done = mainloop

    def bye(self):
        return None


def _get_default_turtle():
    if _state["default_turtle"] is None:
        _state["default_turtle"] = Turtle()
    return _state["default_turtle"]


def forward(distance):
    _get_default_turtle().forward(distance)


fd = forward


def backward(distance):
    _get_default_turtle().backward(distance)


bk = backward
back = backward


def right(angle):
    _get_default_turtle().right(angle)


rt = right


def left(angle):
    _get_default_turtle().left(angle)


lt = left


def goto(x, y=None):
    _get_default_turtle().goto(x, y)


setpos = goto
setposition = goto


def setx(x):
    _get_default_turtle().setx(x)


def sety(y):
    _get_default_turtle().sety(y)


def home():
    _get_default_turtle().home()


def setheading(to_angle):
    _get_default_turtle().setheading(to_angle)


seth = setheading


def circle(radius, extent=None, steps=None):
    _get_default_turtle().circle(radius, extent, steps)


def penup():
    _get_default_turtle().penup()


pu = penup
up = penup


def pendown():
    _get_default_turtle().pendown()


pd = pendown
down = pendown


def isdown():
    return _get_default_turtle().isdown()


def pensize(width=None):
    return _get_default_turtle().pensize(width)


width = pensize


def pencolor(*args):
    return _get_default_turtle().pencolor(*args)


def fillcolor(*args):
    return _get_default_turtle().fillcolor(*args)


def color(*args):
    return _get_default_turtle().color(*args)


def begin_fill():
    _get_default_turtle().begin_fill()


def end_fill():
    _get_default_turtle().end_fill()


def filling():
    return _get_default_turtle().filling()


def dot(size=None, *color_args):
    _get_default_turtle().dot(size, *color_args)


def stamp():
    _get_default_turtle().stamp()


def write(arg, move=False, align="left", font=("Arial", 14, "normal")):
    _get_default_turtle().write(arg, move=move, align=align, font=font)


def hideturtle():
    _get_default_turtle().hideturtle()


ht = hideturtle


def showturtle():
    _get_default_turtle().showturtle()


st = showturtle


def isvisible():
    return _get_default_turtle().isvisible()


def clear():
    _get_default_turtle().clear()


def reset():
    _get_default_turtle().reset()


def speed(s=None):
    return _get_default_turtle().speed(s)


def shape(name=None):
    return _get_default_turtle().shape(name)


def position():
    return _get_default_turtle().position()


pos = position


def xcor():
    return _get_default_turtle().xcor()


def ycor():
    return _get_default_turtle().ycor()


def heading():
    return _get_default_turtle().heading()


def distance(x, y=None):
    return _get_default_turtle().distance(x, y)


def towards(x, y=None):
    return _get_default_turtle().towards(x, y)


def bgcolor(*args):
    return Screen().bgcolor(*args)


def colormode(cmode=None):
    return Screen().colormode(cmode)


def clearscreen():
    Screen().clear()


def resetscreen():
    Screen().reset()


def tracer(n=None, delay=None):
    return Screen().tracer(n, delay)


def update():
    return Screen().update()


def setup(width=None, height=None, startx=None, starty=None):
    return Screen().setup(width, height, startx, starty)


def title(titlestring):
    return Screen().title(titlestring)


def bye():
    return Screen().bye()


def mainloop():
    return None


done = mainloop
exitonclick = mainloop


def _flush_commands():
    idx = _state["flushed_index"]
    batch = _state["commands"][idx:]
    _state["flushed_index"] = len(_state["commands"])
    return batch


def _export_state():
    active = _state["default_turtle"]
    if active is None and _state["turtles"]:
        first_key = next(iter(_state["turtles"]))
        active = _state["turtles"][first_key]

    final_state = {
        "x": round(active._x, 4) if active else 0.0,
        "y": round(active._y, 4) if active else 0.0,
        "heading": round(active._heading, 4) if active else 0.0,
        "penDown": active._pen_down if active else True,
        "penColor": active._pen_color if active else "#1e293b",
        "penSize": active._pen_size if active else 3.0,
        "visible": active._visible if active else True,
    }
    return {
        "commands": list(_state["commands"]),
        "segments": list(_state["segments"]),
        "bgcolor": _state["bgcolor"],
        "finalState": final_state,
    }
