import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import React from "react";
import PropTypes from "prop-types";
import ResizeObserver from "resize-observer-polyfill";

var getScrollParent = function (node) {
  var parent = node;

  while (parent = parent.parentElement) {
    var overflowYVal = getComputedStyle(parent, null).getPropertyValue("overflow-y");
    if (parent === document.body) return window;
    if (overflowYVal === "auto" || overflowYVal === "scroll") return parent;
  }

  return window;
};

var offsetTill = function (node, target) {
  var current = node;
  var offset = 0; // If target is not an offsetParent itself, subtract its offsetTop and set correct target

  if (target.firstChild && target.firstChild.offsetParent !== target) {
    offset += node.offsetTop - target.offsetTop;
    target = node.offsetParent;
    offset += -node.offsetTop;
  }

  do {
    offset += current.offsetTop;
    current = current.offsetParent;
  } while (current && current !== target);

  return offset;
};

var stickyProp = null;

if (typeof CSS !== "undefined" && CSS.supports) {
  if (CSS.supports("position", "sticky")) stickyProp = "sticky";else if (CSS.supports("position", "-webkit-sticky")) stickyProp = "-webkit-sticky";
} // Inspired by https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md#feature-detection


var passiveArg = false;

try {
  var opts = Object.defineProperty({}, "passive", {
    // eslint-disable-next-line getter-return
    get: function get() {
      passiveArg = {
        passive: true
      };
    }
  });
  window.addEventListener("testPassive", null, opts);
  window.removeEventListener("testPassive", null, opts);
} catch (e) {}

var StickyBox = /*#__PURE__*/function (_React$Component) {
  _inheritsLoose(StickyBox, _React$Component);

  function StickyBox(props) {
    var _this = _React$Component.call(this, props) || this;

    _this.addListener = function (element, event, handler, passive) {
      element.addEventListener(event, handler, passive);

      _this.unsubscribes.push(function () {
        return element.removeEventListener(event, handler);
      });
    };

    _this.addResizeObserver = function (node, handler) {
      var ro = new ResizeObserver(handler);
      ro.observe(node);

      _this.unsubscribes.push(function () {
        return ro.disconnect();
      });
    };

    _this.registerContainerRef = function (n) {
      if (!stickyProp) return;
      _this.node = n;

      if (n) {
        _this.scrollPane = getScrollParent(_this.node);
        _this.latestScrollY = _this.scrollPane === window ? window.scrollY : _this.scrollPane.scrollTop;

        _this.addListener(_this.scrollPane, "scroll", _this.handleScroll, passiveArg);

        _this.addListener(_this.scrollPane, "mousewheel", _this.handleScroll, passiveArg);

        if (_this.scrollPane === window) {
          _this.addListener(window, "resize", _this.handleWindowResize);

          _this.handleWindowResize();
        } else {
          _this.addResizeObserver(_this.scrollPane, _this.handleScrollPaneResize);

          _this.handleScrollPaneResize();
        }

        _this.addResizeObserver(_this.node.parentNode, _this.handleParentNodeResize);

        _this.handleParentNodeResize();

        _this.addResizeObserver(_this.node, _this.handleNodeResize);

        _this.handleNodeResize({
          initial: true
        });

        _this.initial();
      } else {
        _this.unsubscribes.forEach(function (fn) {
          return fn();
        });

        _this.unsubscribes = [];
        _this.scrollPane = null;
      }
    };

    _this.getCurrentOffset = function () {
      if (_this.mode === "relative") return _this.offset;
      var _this$props = _this.props,
          offsetTop = _this$props.offsetTop,
          offsetBottom = _this$props.offsetBottom;

      if (_this.mode === "stickyTop") {
        return Math.max(0, _this.scrollPaneOffset + _this.latestScrollY - _this.naturalTop + offsetTop);
      }

      if (_this.mode === "stickyBottom") {
        return Math.max(0, _this.scrollPaneOffset + _this.latestScrollY + _this.viewPortHeight - (_this.naturalTop + _this.nodeHeight + offsetBottom));
      }
    };

    _this.handleWindowResize = function () {
      _this.viewPortHeight = window.innerHeight;
      _this.scrollPaneOffset = 0;

      _this.handleScroll();
    };

    _this.handleScrollPaneResize = function () {
      _this.viewPortHeight = _this.scrollPane.offsetHeight;

      if (process.env.NODE_ENV !== "production" && _this.viewPortHeight === 0) {
        console.warn("react-sticky-box's scroll pane has a height of 0. This seems odd. Please check this node:", _this.scrollPane);
      } // Only applicable if scrollPane is an offsetParent


      if (_this.scrollPane.firstChild.offsetParent === _this.scrollPane) {
        _this.scrollPaneOffset = _this.scrollPane.getBoundingClientRect().top;
      } else {
        _this.scrollPaneOffset = 0;
      }

      _this.handleScroll();
    };

    _this.handleParentNodeResize = function () {
      var parentNode = _this.node.parentNode;
      var computedParentStyle = getComputedStyle(parentNode, null);
      var parentPaddingTop = parseInt(computedParentStyle.getPropertyValue("padding-top"), 10);
      var parentPaddingBottom = parseInt(computedParentStyle.getPropertyValue("padding-bottom"), 10);
      _this.naturalTop = offsetTill(parentNode, _this.scrollPane) + parentPaddingTop + _this.scrollPaneOffset;
      var oldParentHeight = _this.parentHeight;
      _this.parentHeight = parentNode.getBoundingClientRect().height - (parentPaddingTop + parentPaddingBottom);

      if (_this.mode === "relative") {
        if (_this.props.bottom) {
          _this.changeMode("relative");
        } else {
          // If parent height decreased...
          if (oldParentHeight > _this.parentHeight) {
            _this.changeToStickyBottomIfBoxTooLow(_this.latestScrollY);
          }
        }
      }

      if (oldParentHeight !== _this.parentHeight && _this.mode === "relative") {
        _this.latestScrollY = Number.POSITIVE_INFINITY;

        _this.handleScroll();
      }
    };

    _this.handleNodeResize = function (_temp) {
      var _ref = _temp === void 0 ? {} : _temp,
          initial = _ref.initial;

      var prevHeight = _this.nodeHeight;
      _this.nodeHeight = _this.node.getBoundingClientRect().height;

      if (!initial && prevHeight !== _this.nodeHeight) {
        var _this$props2 = _this.props,
            offsetTop = _this$props2.offsetTop,
            offsetBottom = _this$props2.offsetBottom,
            bottom = _this$props2.bottom;

        if (_this.nodeHeight + offsetTop + offsetBottom <= _this.viewPortHeight) {
          // Just make it sticky if node smaller than viewport
          _this.mode = undefined;

          _this.initial();
        } else {
          var diff = prevHeight - _this.nodeHeight;
          var lowestPossible = _this.parentHeight - _this.nodeHeight;
          var nextOffset = Math.min(lowestPossible, _this.getCurrentOffset() + (bottom ? diff : 0));
          _this.offset = Math.max(0, nextOffset);
          if (!bottom || _this.mode !== "stickyBottom") _this.changeMode("relative");
        }
      }
    };

    _this.handleScroll = function () {
      var _this$props3 = _this.props,
          offsetTop = _this$props3.offsetTop,
          offsetBottom = _this$props3.offsetBottom;
      var scrollY = _this.scrollPane === window ? window.scrollY : _this.scrollPane.scrollTop;
      if (scrollY === _this.latestScrollY) return;

      if (_this.nodeHeight + offsetTop + offsetBottom <= _this.viewPortHeight) {
        // Just make it sticky if node smaller than viewport
        _this.initial();

        _this.latestScrollY = scrollY;
        return;
      }

      var scrollDelta = scrollY - _this.latestScrollY;
      _this.offset = _this.getCurrentOffset();

      if (scrollDelta > 0) {
        // scroll down
        if (_this.mode === "stickyTop") {
          if (scrollY + _this.scrollPaneOffset + offsetTop > _this.naturalTop) {
            if (scrollY + _this.scrollPaneOffset + _this.viewPortHeight <= _this.naturalTop + _this.nodeHeight + _this.offset + offsetBottom) {
              _this.changeMode("relative");
            } else {
              _this.changeMode("stickyBottom");
            }
          }
        } else if (_this.mode === "relative") {
          _this.changeToStickyBottomIfBoxTooLow(scrollY);
        }
      } else {
        // scroll up
        if (_this.mode === "stickyBottom") {
          if (_this.scrollPaneOffset + scrollY + _this.viewPortHeight < _this.naturalTop + _this.parentHeight + offsetBottom) {
            if (_this.scrollPaneOffset + scrollY + offsetTop >= _this.naturalTop + _this.offset) {
              _this.changeMode("relative");
            } else {
              _this.changeMode("stickyTop");
            }
          }
        } else if (_this.mode === "relative") {
          if (_this.scrollPaneOffset + scrollY + offsetTop < _this.naturalTop + _this.offset) {
            _this.changeMode("stickyTop");
          }
        }
      }

      _this.latestScrollY = scrollY;
    };

    if (props.offset && process.env.NODE_ENV !== "production") {
      console.warn("react-sticky-box's \"offset\" prop is deprecated. Please use \"offsetTop\" instead. It'll be removed in v0.8.");
    }

    _this.unsubscribes = [];
    return _this;
  }

  var _proto = StickyBox.prototype;

  _proto.changeMode = function changeMode(newMode) {
    var _this$props4 = this.props,
        onChangeMode = _this$props4.onChangeMode,
        offsetTop = _this$props4.offsetTop,
        offsetBottom = _this$props4.offsetBottom,
        bottom = _this$props4.bottom;
    if (this.mode !== newMode) onChangeMode(this.mode, newMode);
    this.mode = newMode;

    if (newMode === "relative") {
      this.node.style.position = "relative";

      if (bottom) {
        var nextBottom = Math.max(0, this.parentHeight - this.nodeHeight - this.offset);
        this.node.style.bottom = nextBottom + "px";
      } else {
        this.node.style.top = this.offset + "px";
      }
    } else {
      this.node.style.position = stickyProp;

      if (newMode === "stickyBottom") {
        if (bottom) {
          this.node.style.bottom = offsetBottom + "px";
        } else {
          this.node.style.top = this.viewPortHeight - this.nodeHeight - offsetBottom + "px";
        }
      } else {
        // stickyTop
        if (bottom) {
          this.node.style.bottom = this.viewPortHeight - this.nodeHeight - offsetBottom + "px";
        } else {
          this.node.style.top = offsetTop + "px";
        }
      }
    }

    this.offset = this.getCurrentOffset();
  };

  _proto.initial = function initial() {
    var bottom = this.props.bottom;

    if (bottom) {
      if (this.mode !== "stickyBottom") this.changeMode("stickyBottom");
    } else {
      if (this.mode !== "stickyTop") this.changeMode("stickyTop");
    }
  };

  _proto.changeToStickyBottomIfBoxTooLow = function changeToStickyBottomIfBoxTooLow(scrollY) {
    var offsetBottom = this.props.offsetBottom;

    if (scrollY + this.scrollPaneOffset + this.viewPortHeight >= this.naturalTop + this.nodeHeight + this.offset + offsetBottom) {
      this.changeMode("stickyBottom");
    }
  };

  _proto.render = function render() {
    var _this$props5 = this.props,
        children = _this$props5.children,
        className = _this$props5.className,
        style = _this$props5.style;
    return /*#__PURE__*/React.createElement("div", {
      className: className,
      style: style,
      ref: this.registerContainerRef
    }, children);
  };

  return StickyBox;
}(React.Component);

export { StickyBox as default };
StickyBox.defaultProps = {
  onChangeMode: function onChangeMode() {},
  offsetTop: 0,
  offsetBottom: 0
};
process.env.NODE_ENV !== "production" ? StickyBox.propTypes = {
  onChangeMode: PropTypes.func,
  offsetTop: PropTypes.number,
  offsetBottom: PropTypes.number,
  bottom: PropTypes.bool
} : void 0;