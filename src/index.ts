import * as copy from 'copy-to-clipboard';
import { ua, detector } from './detector';
export { ua, detector }

/**
 * iframe call
 * @param url
 */
export function iframeCall(url: string) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', url);
    iframe.setAttribute('style', 'display:none');
    document.body.appendChild(iframe);
    setTimeout(function () {
        document.body.removeChild(iframe);
    }, 200);
}

/**
 * location call
 * @param url
 */
export function locationCall(url: string) {
    location.href = url;
}

/**
 * merge object
 */
function deepMerge(firstObj, secondObj) {
    for (var key in secondObj) {
        firstObj[key] = firstObj[key] && firstObj[key].toString() === "[object Object]" ?
            deepMerge(firstObj[key], secondObj[key]) : firstObj[key] = secondObj[key];
    }
    return firstObj;
}

const inWexin = detector.browser.name === 'micromessenger';
const enableULink = detector.os.name === 'ios' && detector.os.version >= 9;
const enableApplink = detector.os.name === 'android' && detector.os.version >= 6;

export class LaunchApp {
    static defaultConfig: any = {
        inApp: false,
        appVersion: '',
        // 应用商店包名
        pkgName: '',
        deeplink: {
            scheme: {
                android: {
                    protocol: 'protocol',
                    index: {
                        path: 'path',
                        param: {},
                        paramMap: {
                        },
                        version: ''
                    }
                },
                ios: {
                    protocol: 'protocol',
                    index: {
                        path: 'path',
                        param: {},
                        paramMap: {
                        },
                        version: ''
                    }
                }
            },
            link: {
                index: {
                    url: '',
                    param: {
                    },
                    paramMap: {
                    },
                    version: 0
                }
            },
            yyb: {
                url: 'http://a.app.qq.com/o/simple.jsp',
                param: {
                    pkgname: '',
                    ckey: ''
                }
            }
        },
        pkgs: {
            yyb: '',
            android: '',
            ios: '',
            store: {
                samsung: {
                    reg: /\(.*Android.*(SAMSUNG|SM-|GT-).*\)/,
                    scheme: 'samsungapps://ProductDetail/{id}'
                },
                android: {
                    reg: /\(.*Android.*\)/,
                    scheme: 'market://details?id={id}&a=3'
                }
            }
        },
        // use UniversalLink for android6+(default:true)
        useAppLink: true,
        // use UniversalLink for ios9+(default:true)
        useUniversalLink: true,
        useYingyongbao: true,
        // 微信引导
        wxGuideMethod: () => {
            const div = document.createElement('div');
            div.style.position = 'absolute'
            div.style.top = '0';
            div.style.zIndex = '1111';
            div.style.width = '100%';
            div.style.height = '100%';
            div.innerHTML = '<div style="height:100%;background-color:#000;opacity:0.5;"></div><p style="position:absolute;top:0px;background-color:white;font-size:80px;padding: 20px 40px;margin: 0 40px;">点击右上角->选择在浏览器中打开->即可打开或下载APP</p>';
            document.body.appendChild(div);
            div.onclick = function () {
                div.remove();
            }
        },
        // 升级提示
        updateTipMethod: () => {
            alert('升级才能使用此功能！');
        },
        // 口令
        clipboardTxt: '',
        // 参数前缀
        searchPrefix: (detector: any) => { return '?' },
        // 超时下载, <0表示不使用超时下载
        timeout: 2000,
        // 兜底页面
        landPage: 'https://github.com/jawidx/web-launch-app'
    };
    static openChannel = {
        scheme: {
            preOpen(opt: any) {
                let pageMap: any = {};
                if (detector.os.name === 'android') {
                    pageMap = this.configs.deeplink.scheme.android;
                } else if (detector.os.name === 'ios') {
                    pageMap = this.configs.deeplink.scheme.ios;
                }
                let pageConf = pageMap[opt.page] || pageMap['index'];
                pageConf = (<any>Object).assign({}, pageConf, opt);
                // 版本检测
                if (this.configs.inApp && pageConf.version && !this.checkVersion(pageConf)) {
                    return '';
                }
                if (pageConf.paramMap) {
                    pageConf.param = this._paramMapProcess(pageConf.param, pageConf.paramMap);
                }
                return this._getUrlFromConf(pageConf, 'scheme');
            },
            open: function (url: string) {
                if (!url) {
                    return;
                }
                if (this.timeoutDownload) {
                    this._setTimeEvent();
                }
                if (detector.os.name === 'ios' && detector.browser.name == 'safari') {
                    locationCall(url);
                } else {
                    iframeCall(url);
                }
            }
        },
        link: {
            preOpen: function (opt: any) {
                const pageMap = this.configs.deeplink.link;
                let pageConf = pageMap[opt.page] || pageMap['index'];
                pageConf = (<any>Object).assign({}, pageConf, opt);
                if (pageConf.paramMap) {
                    pageConf.param = this._paramMapProcess(pageConf.param, pageConf.paramMap);
                }
                return this._getUrlFromConf(pageConf, 'link');
            },
            open: function (url: string) {
                locationCall(url);
            }
        },
        yingyongbao: {
            preOpen: function (opt: any) {
                let pageConf = deepMerge(this.configs.deeplink.yyb, { param: opt.param });
                return this._getUrlFromConf(pageConf, 'yyb');
            },
            open: function (url: string) {
                locationCall(url);
            }
        },
        wxGuide: {
            open: function () {
                let func = this.options.wxGuideMethod || this.configs.wxGuideMethod;
                func && func(detector);
            }
        },
        store: {
            open: function (noTimeout) {
                if (!noTimeout && this.timeoutDownload) {
                    this._setTimeEvent();
                }
                if (detector.os.name === 'ios') {
                    locationCall(this.configs.pkgs.ios);
                } else if (detector.os.name === 'android') {
                    let store = this.configs.pkgs.store, brand, url;
                    for (let key in store) {
                        brand = store[key];
                        if (brand && brand.reg.test(ua)) {
                            url = this._getUrlFromConf(brand, 'store');
                            iframeCall(url);
                            break;
                        }
                    }
                    if (noTimeout && !url) {
                        locationCall(this.options.landPage || this.configs.landPage);
                    }
                }
                // 未匹配到商店会走超时逻辑走兜底
            }
        },
        unknown: {
            open: function () {
                locationCall(this.options.landPage || this.configs.landPage);
            }
        }
    };
    static openStatus = {
        FAILED: 0,
        SUCCESS: 1,
        UNKNOW: 2
    };
    // config
    private configs: any;
    private openMethod: any;
    private timer: any;
    // param
    private options: any;
    private timeoutDownload: boolean;
    private callback: (status: number, detector: any) => number;
    // other
    private callbackId = 0;
    constructor(opt: any) {
        let tmpConfig = deepMerge({}, LaunchApp.defaultConfig);
        this.configs = deepMerge(tmpConfig, opt);
        this.openMethod = this._getOpenMethod();
    }

    /**
     * select open method according to the environment and options
     */
    _getOpenMethod() {
        if (inWexin) {
            if (this.configs.useYingyongbao) {
                return LaunchApp.openChannel.yingyongbao;
            } else if (this.configs.wxGuideMethod) {
                return LaunchApp.openChannel.wxGuide;
            }
        }
        if ((this.configs.useUniversalLink && enableULink) || (this.configs.useAppLink && enableApplink)) {
            return LaunchApp.openChannel.link;
        }
        if (detector.os.name == 'ios' || detector.os.name == 'android') {
            return LaunchApp.openChannel.scheme;
        }
        return LaunchApp.openChannel.unknown;
    }

    /**
     * launch app
     * @param {*} opt 
     * {
     * page:'index',
     * param:{},
     * paramMap:{}
     * scheme:'', for scheme
     * url:'', for link
     * launchType:{
     *     ios:link/scheme/store
     *     android:link/scheme/store
     * }
     * wxGuideMethod
     * updateTipMethod
     * clipboardTxt
     * pkgs:{android:'',ios:'',yyb:'',store:{...}}
     * timeout 是否走超时逻辑,<0表示不走
     * landPage
     * callback 端回调方法
     * },
     * @param {*} callback number(1 download,0 landpage,-1 nothing)
     */
    open(opt?: any, callback?: (status: number, detector: any) => number) {
        try {
            this.options = opt;
            this.callback = callback;
            this.timeoutDownload = opt.timeout >= 0 || (this.configs.timeout >= 0 && opt.timeout == undefined);
            let tmpOpenMethod = null, needPro = true;

            // 指定降级调起方案
            if (inWexin) {
                // 腾讯系产品
                if (opt.wxGuideMethod === null) {
                    tmpOpenMethod = LaunchApp.openChannel.unknown;
                    if ((this.configs.useUniversalLink && enableULink) || (this.configs.useAppLink && enableApplink)) {
                        tmpOpenMethod = LaunchApp.openChannel.link;
                    } else if (detector.os.name == 'ios' || detector.os.name == 'android') {
                        tmpOpenMethod = LaunchApp.openChannel.scheme;
                    }
                } else if (opt.wxGuideMethod) {
                    tmpOpenMethod = LaunchApp.openChannel.wxGuide;
                    needPro = false;
                }
            } else if (opt.launchType) {
                let type;
                switch (detector.os.name) {
                    case 'ios':
                        type = opt.launchType.ios;
                        break;
                    case 'android':
                        type = opt.launchType.android;
                        break;
                }
                switch (type) {
                    case 'link':
                        tmpOpenMethod = LaunchApp.openChannel.link;
                        break;
                    case 'scheme':
                        tmpOpenMethod = LaunchApp.openChannel.scheme;
                        break;
                    case 'store':
                        tmpOpenMethod = LaunchApp.openChannel.store;
                        needPro = false;
                        break;
                }
            }
            tmpOpenMethod = tmpOpenMethod || this.openMethod;

            if (typeof opt.callback === 'function') {
                opt.param = opt.param || {};
                let funcName = '_wla_func_' + (++this.callbackId);
                window[funcName] = function () {
                    opt.callback.apply(window, ([]).slice.call(arguments, 0));
                };
                opt.param['callback'] = funcName;
            } else {
                if (opt.callback) {
                    opt.param['callback'] = callback;
                }
            }

            if (needPro) {
                const openUrl = tmpOpenMethod.preOpen && tmpOpenMethod.preOpen.call(this, opt || {});
                tmpOpenMethod.open.call(this, openUrl);
            } else {
                tmpOpenMethod.open.call(this);
            }

            if (opt.clipboardTxt) {
                copy(opt.clipboardTxt);
            }
        } catch (e) {
            console.log('launch error:', e);
            locationCall(this.options.landPage || this.configs.landPage);
        }
    }

    /**
     * download package
     * opt: {android:'',ios:''，yyk:'',landPage}
     */
    download(opt?: any) {
        let pkgs = (<any>Object).assign({}, this.configs.pkgs, opt);

        if (detector.browser.name == 'micromessenger' || detector.browser.name == 'qq') {
            locationCall(pkgs.yyb);
        } else if (detector.os.name === 'android') {
            locationCall(pkgs.android);
        } else if (detector.os.name === 'ios') {
            locationCall(pkgs.ios);
        } else {
            locationCall(opt.landPage || this.configs.landPage);
        }
    }

    /**
     * 检验版本
     * @param pageConf {version:''}
     */
    checkVersion(pageConf) {
        if (pageConf.version > this.configs.appVersion) {
            let func = this.options.updateTipMethod || this.configs.updateTipMethod;
            func && func();
            return false;
        }
        return true;
    }

    /**
     * map param (for different platform)
     * @param {*} param 
     * @param {*} paramMap 
     */
    _paramMapProcess(param: any, paramMap: any) {
        if (!paramMap) {
            return param;
        }

        let newParam: any = {};
        for (let k in param) {
            if (paramMap[k]) {
                newParam[paramMap[k]] = param[k];
            } else {
                newParam[k] = param[k];
            }
        }

        return newParam;
    }

    /**
     * generating URL parameters
     * @param {*} obj 
     */
    _stringtifyParams(obj: any) {
        if (!obj) {
            return '';
        }
        let str = '';
        for (let k in obj) {
            if (!obj.hasOwnProperty(k)) {
                continue;
            }
            if (typeof obj[k] == 'object') {
                str += k + '=' + encodeURIComponent(JSON.stringify(obj[k])) + '&';
            } else {
                str += k + '=' + obj[k] + '&';
            }
        };
        return str ? str.substr(0, str.length - 1) : str;
    }

    /**
     * generating URL
     * @param {*} conf 
     * @param type 'scheme link yyb'
     */
    _getUrlFromConf(conf: any, type: string) {
        let paramStr = conf.param && this._stringtifyParams(conf.param);
        let strUrl = '';
        switch (type) {
            case 'link':
                // 对url进行参数处理 'tieba.baidu.com/p/{pid}'
                let url = conf.url;
                const placeholders = url.match(/\{.*?\}/g);
                placeholders && placeholders.forEach((ph: string, i: number) => {
                    const key = ph.substring(1, ph.length - 1);
                    url = url.replace(ph, conf.param[key]);
                    delete conf.param[key];
                });

                strUrl = url + (paramStr ? ((url.indexOf('?') > 0 ? '&' : '?') + paramStr) : '');
                break;
            case 'scheme':
                if (this.options.scheme) {
                    strUrl = this.options.scheme + (paramStr ? this.configs.searchPrefix(detector) + paramStr : '');
                } else {
                    let protocol = conf.protocol || (detector.os.name === 'ios' ? this.configs.deeplink.scheme.ios.protocol : this.configs.deeplink.scheme.android.protocol);
                    strUrl = protocol + '://' +
                        (conf.host ? conf.host + '/' + conf.path : conf.path) +
                        (paramStr ? this.configs.searchPrefix(detector) + paramStr : '');
                }
                break;
            case 'yyb':
                strUrl = conf.url + (paramStr ? ((conf.url.indexOf('?') > 0 ? '&' : '?') + paramStr) : '');
                break;
            case 'store':
                strUrl = conf.scheme.replace('{id}', conf.pkgName || this.configs.pkgName);
                break;
        }
        return strUrl;
    }

    _callend(status: number) {
        clearTimeout(this.timer);
        const backResult = this.callback && this.callback(status, detector);
        // 调起失败处理
        if (status != LaunchApp.openStatus.SUCCESS) {
            if (backResult == 1) {
                this.download(this.options.pkgs);
            } else if (backResult == 2) {
                locationCall(this.options.landPage || this.configs.landPage);
            } else if (backResult == 3) {
                LaunchApp.openChannel.store.open.call(this, true);
            }
        }
    }

    /**
     * determine whether or not open successfully
     */
    _setTimeEvent() {
        const self = this;
        let haveChange = false;

        let property = 'hidden', eventName = 'visibilitychange';
        if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support
            property = 'hidden';
            eventName = 'visibilitychange';
        } else if (typeof (<any>document).msHidden !== 'undefined') {
            property = 'msHidden';
            eventName = 'msvisibilitychange';
        } else if (typeof (<any>document).webkitHidden !== 'undefined') {
            property = 'webkitHidden';
            eventName = 'webkitvisibilitychange';
        }

        const pageChange = function (e) {
            haveChange = true;
            if (document.hidden || e.hidden) {
                self._callend(LaunchApp.openStatus.SUCCESS);
            } else {
                self._callend(LaunchApp.openStatus.UNKNOW);
            }
            document.removeEventListener('pagehide', pageChange);
            document.removeEventListener(eventName, pageChange);
            document.removeEventListener('baiduboxappvisibilitychange', pageChange);
        };
        window.addEventListener('pagehide', pageChange, false);
        document.addEventListener(eventName, pageChange, false);
        document.addEventListener('baiduboxappvisibilitychange', pageChange, false);


        this.timer = setTimeout(function () {
            if (haveChange) {
                return;
            }
            // document.removeEventListener('visibilitychange', pageChange);
            document.removeEventListener('pagehide', pageChange);
            document.removeEventListener(eventName, pageChange);
            document.removeEventListener('baiduboxappvisibilitychange', pageChange);

            // document.removeEventListener
            if (!document.hidden && !haveChange) {
                self._callend(LaunchApp.openStatus.FAILED);
            } else {
                alert('unknown');
                self._callend(LaunchApp.openStatus.UNKNOW);
            }
            haveChange = true;
        }, this.options.timeout || this.configs.timeout);
    }
}
