// ==UserScript==
// @name         某二维码实时生成工具
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  查找对应课程,并生成二维码
// @author       Yosukana Imosaku
// @match        https://iclass.buaa.edu.cn:8346/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=buaa.edu.cn
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
// ==/UserScript==

(function() {
    'use strict';

    const targetHash = "#/my/stuAttendance";  // 目标页面哈希部分
    let qrContainer = null;  // 存放二维码的 div
    let courseSchedId = null;  // 存储 courseSchedId
    let latestRequestTimestamp = 0;  // 记录最新请求的时间戳

    function checkPageChange() {
        setTimeout(() => {  // 延迟 100ms，确保页面 DOM 更新
            if (window.location.hash.includes(targetHash)) {  // 根据 hash 判断页面
                showQRCode();
            } else {
                removeQRCode();
            }
        }, 100);
    }

    function showQRCode() {
        if (qrContainer) return; // 避免重复添加
        qrContainer = document.createElement("div");
        qrContainer.style.position = "fixed";
        qrContainer.style.bottom = "10px";
        qrContainer.style.right = "10px";
        qrContainer.style.padding = "10px";
        qrContainer.style.background = "#fff";
        qrContainer.style.border = "1px solid #ccc";
        qrContainer.style.boxShadow = "0px 0px 5px rgba(0,0,0,0.3)";
        qrContainer.style.zIndex = "9999";
        document.body.appendChild(qrContainer);
        // 每隔 3 秒刷新一次二维码
        setInterval(() => {
            updateQRCode();
        }, 3000);
    }

    function updateQRCode() {
        if (!courseSchedId) return;  // 没有 courseSchedId 时不生成二维码

        // 获取当前时间戳，单位为毫秒
        const timestamp = Date.now();  // 当前时间戳（毫秒）

        // 动态生成二维码跳转的 URL
        const targetURL = `http://iclass.buaa.edu.cn:8081/app/course/stu_scan_sign.action?courseSchedId=${courseSchedId}&timestamp=${timestamp}`;

        // 移除旧二维码并生成新二维码
        qrContainer.innerHTML = '';  // 清空当前二维码内容
        new QRCode(qrContainer, {
            text: targetURL,  // 生成的二维码跳转链接
            width: 128,
            height: 128
        });
    }

    function removeQRCode() {
        if (qrContainer) {
            qrContainer.remove();
            qrContainer = null;
        }
    }

    // 劫持 XMLHttpRequest 以拦截所有 POST 请求
    (function() {
        const originalOpen = XMLHttpRequest.prototype.open;

        XMLHttpRequest.prototype.open = function(method, url) {
            if (method === "POST") {  // 所有 POST 请求都处理
                const originalSend = this.send;

                this.send = function(data) {
                    this.addEventListener('load', function() {
                        if (this.status === 200) {
                            try {
                                const response = JSON.parse(this.responseText);

                                // 获取当前请求的时间戳
                                const requestTimestamp = Date.now();

                                // 判断是否是最新的请求
                                if (requestTimestamp > latestRequestTimestamp) {
                                    latestRequestTimestamp = requestTimestamp;  // 更新最新请求时间戳

                                    // 获取 result 中 courseSchedId 最大的那个
                                    if (response.result && Array.isArray(response.result)) {
                                        const maxCourseSchedId = Math.max(...response.result.map(item => item.courseSchedId));
                                        courseSchedId = maxCourseSchedId.toString();  // 更新 courseSchedId
                                    }
                                }
                            } catch (e) {
                                console.error("响应解析失败", e);
                            }
                        }
                    });
                    originalSend.apply(this, arguments);
                };
            }

            originalOpen.apply(this, arguments);
        };
    })();

    // 劫持 pushState
    (function(history) {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            window.dispatchEvent(new Event("pushstate"));
        };

    })(window.history);

    // 监听 pushState
    window.addEventListener("pushstate", checkPageChange);

    // 初始化检测
    checkPageChange();
})();

