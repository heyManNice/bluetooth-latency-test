
async function play_sin() {
    let time = Date.now();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(config.oscillator.frequenc, audioContext.currentTime);
    let selectedDeviceId = select.value;
    let audioDestination = audioContext.createMediaStreamDestination();
    oscillator.connect(audioDestination);

    audio = new Audio();
    audio.srcObject = audioDestination.stream;
    await audio.setSinkId(selectedDeviceId);

    audio.play();
    oscillator.start();
    data.play_sin_time = Date.now() - time;
    setTimeout(function () {
        oscillator.stop();
        oscillator.disconnect();
        audioContext.close();
    }, config.oscillator.duration);
}

async function getAudioDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(device => device.kind === 'audiooutput');

    audioDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Device ${select.length + 1}`;
        select.appendChild(option);
    });
}

function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

/**
 * 倒计时并执行函数
 * @param {number} start 倒计时开始的时间(s)
 * @param {number} interval 每一步的间隔(s)
 * @param {function} interval_func 每一步执行的函数
 * @param {function} end_func 倒计时结束执行的函数
 */
function countdown(start, interval, interval_func, end_func) {
    let next_start = start - interval;
    interval_func && interval_func(start);
    if (next_start) {
        setTimeout(() => {
            countdown(next_start, interval, interval_func, end_func);
        }, interval * 1000);
    } else {
        setTimeout(() => {
            end_func && end_func();
        }, interval * 1000);
    }

}

function finish() {
    let wired_ave = data.wired.reduce((s, i) => s + i, 0) / data.wired.length;
    let wireless_ave = data.wireless.reduce((s, i) => s + i, 0) / data.wireless.length;
    let wired_variance = data.wired.reduce((sum, value) => sum + (value - wired_ave) ** 2, 0) / data.wired.length;
    let wireless_variance = data.wireless.reduce((sum, value) => sum + (value - wireless_ave) ** 2, 0) / data.wireless.length;
    let kale = Math.ceil(wireless_ave - wired_ave);
    let reliability = Math.floor(100 - data.prediction * 10 - Math.sqrt(wired_variance) - Math.sqrt(wireless_variance));
    btn.innerHTML = "重新开始";
    btn.onclick = () => {
        data = JSON.parse(JSON.stringify(data_backup));
        start();
        btn.onclick = start;
    }
    title.innerHTML = `你的蓝牙耳机时延为${kale}ms（可信度${reliability < 0 ? 0 : reliability}%）`;
}

function start() {
    let delay = getRandomInt(config.random.min, config.random.max);
    let scene = document.querySelector(".scene");
    let progress = document.querySelector(".progress");
    scene.style.height = "100vh";
    info.innerHTML = "等待Bi声...";
    scene.onmousedown = () => {
        data.prediction++;
        return info.innerHTML = "请不要预判";
    }
    setTimeout(() => {
        let start_time = Date.now();
        play_sin();
        scene.onmousedown = () => {
            scene.onmousedown = "";
            let reaction = Date.now() - start_time - data.play_sin_time;
            data.current++;
            let progress_current = data.current;
            if (data.current > config.times / 2) {
                progress_current -= config.times / 2;
                data.wireless.push(reaction);
            } else {
                data.wired.push(reaction);
            }
            progress.style.width = 200 / config.times * (progress_current) + "vw";
            info.innerHTML = reaction + "ms";
            count.style.animation = "count 1s " + config.scene.countdown;
            if (data.current == config.times / 2) {
                render_table();
                scene.style.height = "0vh";
                progress.style.width = "0vw"
                render_template({
                    device: "蓝牙耳机"
                }, title)
                count.innerHTML = "";
                count.style.animation = "";
                return
            }
            if (data.current == config.times) {
                render_table();
                scene.style.height = "0vh";
                progress.style.width = "0vw"
                count.innerHTML = "";
                count.style.animation = "";
                finish();
                return
            }
            countdown(config.scene.countdown, 1,
                (i) => {
                    count.innerHTML = i;
                },
                () => {
                    info.innerHTML = "等待Bi声...";
                    count.innerHTML = "";
                    count.style.animation = "";
                    start();
                }
            );
        }
    }, delay);
}

function render_table() {
    let thead_str = "<td>设备</td>";
    let tbody_str_wired = "<td>扬声器(ms)</td>";
    let tbody_str_wireless = "<td>蓝牙耳机(ms)</td>";
    for (let i = 0; i < config.times / 2; i++) {
        thead_str += `<td>${i + 1}</td>`
        tbody_str_wired += `<td>${data.wired[i] ?? "无"}</td>`;
        tbody_str_wireless += `<td>${data.wireless[i] ?? "无"}</td>`;
    }
    thead_str += `<td>平均值</td>`;
    let wired_ave = data.wired.reduce((s, i) => s + i, 0) / data.wired.length;
    let wireless_ave = data.wireless.reduce((s, i) => s + i, 0) / data.wireless.length;

    tbody_str_wired += `<td>${wired_ave}</td>`;
    tbody_str_wireless += `<td>${wireless_ave}</td>`;

    thead.innerHTML = `<tr>${thead_str}</tr>`;
    tbody.innerHTML = `<tr>${tbody_str_wired}</tr><tr>${tbody_str_wireless}</tr>`
}

/**
 * 渲染模板html，将其中的{{*}}替换成obj中对应的值
 * @param {object} obj 
 * @param {Element} element 
 */
function render_template(obj, element) {
    if (!element.originalHTML) {
        element.originalHTML = element.innerHTML;
    }
    let html = element.originalHTML;
    html = html.replace(/{{\s*([^{}\s]+)\s*}}/g, (match, key) => {
        return obj[key] !== undefined ? obj[key] : match;
    });
    element.innerHTML = html;
}

function render_menu() {
    render_table();
    render_template({
        t: config.times / 2
    }, sub_title);
}

window.onload = function () {
    let scene = document.querySelector(".scene");
    let ripple = document.querySelector(".ripple");
    render_menu();
    render_template({
        device: "扬声器"
    }, title)
    btn.onclick = start;
    scene.addEventListener("mousemove", (e) => {
        let viewportWidth = window.innerWidth;
        let viewportHeight = window.innerHeight;
        let clientX = e.clientX;
        let clientY = e.clientY;

        let x = clientX - viewportWidth / 2;
        let y = clientY - viewportHeight / 2;
        ripple.style.top = y + "px";
        ripple.style.left = x + "px";
    });
    scene.addEventListener("mousedown", () => {
        let ripple = document.querySelector(".ripple");
        ripple.classList.add("ripple_palying");
    });
    ripple.addEventListener("animationend", () => {
        ripple.classList.remove('ripple_palying');
    });
    navigator.mediaDevices.getUserMedia({ audio: true })
    .catch(error => {
        alert("请给予音频设备访问权限后刷新，以获取所有的音频设备信息，本网站不会上传你的数据，网站开源可查证");
    });
    getAudioDevices();
}



let config = {
    times: 12,
    random: {
        min: 1000,
        max: 5000
    },
    oscillator: {
        frequenc: 440,
        duration: 500
    },
    scene: {
        countdown: 3
    }
}

console.log("你想改配置吗：", config);

let data = {
    current: 0,
    prediction: 0,
    wired: [],
    wireless: [],
    play_sin_time: 0         //播放音频消耗的时间
}
let data_backup = JSON.parse(JSON.stringify(data));