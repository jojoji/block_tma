System.register([], function (_export, _context) {
    "use strict";

    var Application;
    return {
        setters: [],
        execute: function () {
            _export("Application", Application = /*#__PURE__*/function () {
                function Application() {
                    this.settingsPath = 'src/settings.json';
                    this.showFPS = false;
                }

                var _proto = Application.prototype;

                _proto.init = function init(engine) {
                    cc = engine;
                    cc.game.onPostBaseInitDelegate.add(this.onPostInitBase.bind(this));
                    cc.game.onPostSubsystemInitDelegate.add(this.onPostSystemInit.bind(this));
                };

                _proto.onPostInitBase = function onPostInitBase() {
                    // [CUSTOM] Enable transparent canvas support immediately after base init
                    cc.macro.ENABLE_TRANSPARENT_CANVAS = true;
                    // cc.settings.overrideSettings('assets', 'server', '');
                };

                _proto.onPostSystemInit = function onPostSystemInit() {
                    // do custom logic
                };

                _proto.start = function start() {
                    return cc.game.init({
                        debugMode: false ? cc.DebugMode.INFO : cc.DebugMode.ERROR,
                        settingsPath: this.settingsPath,
                        // [CUSTOM] Check if alpha option is needed here, typically macro is enough
                        overrideSettings: {
                            profiling: {
                                showFPS: this.showFPS
                            }
                        }
                    }).then(function () {
                        return cc.game.run();
                    });
                };

                return Application;
            }());
        }
    };
});
