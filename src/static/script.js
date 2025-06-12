// 配置信息
const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:8087/airdetect',  // 后台地址
    API_URL_REAL_BACKEND: '/dataJson', // 真实数据API路径
    API_URL_SIMULATE_BACKEND: '/dataJsonSimulate', // 后台模拟数据API路径
    API_URL_SEND_ANEMOMETER: '/sendAnemometer', // 发送热线仪命令API路径
    DATA_SOURCE: 'real_backend' // 数据来源：'real_backend'真实数据, 'simulate_backend'后台模拟, 'simulate_frontend'前台模拟
};

// 数据对象
let data = {}, interval = 1000, timer = null, isSystemRunning = false, previousData = {};

// 计算数据趋势
function calculateTrends() {
    for (const key in data) {
        if (data[key] !== previousData[key]) {
            const newValue = parseFloat(data[key]);
            const oldValue = parseFloat(previousData[key]);
            if (!isNaN(newValue) && !isNaN(oldValue)) {
                data[`${key}Trend`] = newValue > oldValue ? 'up' : newValue < oldValue ? 'down' : 'none';
            } else {
                data[`${key}Trend`] = 'none';
            }
        } else {
            data[`${key}Trend`] = 'none';
        }
    }
    previousData = { ...data };
}

// 前台模拟数据
function getDataFrontEnd() {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    
    // 生成随机数据
    const randomValue = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
    
    // 直接返回JSON对象
    const simulatedData = {
        Date: dateStr,
        Time: timeStr,
        JD: randomFloat(110, 120),
        WD: randomFloat(30, 40),
        HB: randomFloat(1000, 5000),
        East: randomFloat(-10, 10),
        North: randomFloat(-10, 10),
        Tx: randomFloat(-10, 10),
        SidAng: randomFloat(-180, 180),
        R: randomFloat(-180, 180),
        PitAngle: randomFloat(-90, 90),
        P: randomFloat(-90, 90),
        HeaAng: randomFloat(-180, 180),
        Y: randomFloat(-180, 180),
        XW: randomFloat(-20, 20),
        YW: randomFloat(-20, 20),
        ZW: randomFloat(-20, 20),
        AF: randomFloat(-20, 20),
        BT: randomFloat(-20, 20),
        SPr1: randomFloat(800, 1200),
        Spr2: randomFloat(800, 1200),
        CY1: randomFloat(0, 100),
        CY2: randomFloat(0, 100),
        HT: randomFloat(-10, 30),
        HR: randomFloat(0, 100),
        NT: randomFloat(-10, 30),
        DI: randomFloat(-10, 30),
        ISTA: randomValue(0, 1),
        IFTA: randomValue(0, 1),
        ANT: randomFloat(-10, 10),
        V: randomFloat(-10, 10),
        I: randomFloat(-10, 10),
        LWC: randomFloat(-10, 10),
        LWS: randomFloat(-10, 10),
        LWP: randomFloat(-10, 10),
        LWPS: randomFloat(-10, 10)
    };

    // 更新数据
    data = simulatedData;
    
    // 计算趋势
    calculateTrends();

    // 更新UI
    updateUI();
}

// 从后台获取JSON格式数据
function getDataBackEnd() {
    const apiPath = CONFIG.API_BASE_URL + (CONFIG.DATA_SOURCE === 'real_backend' ? CONFIG.API_URL_REAL_BACKEND : CONFIG.API_URL_SIMULATE_BACKEND);
    $.ajax({
        url: apiPath,
        type: 'GET',
        dataType: 'json',
        crossDomain: true,
        success: function(response) {
            if (response.code === 200 && response.data) {
                // 更新数据
                data = response.data;
                // 计算趋势
                calculateTrends();
                // 更新UI
                updateUI();
            } else {
                console.warn('后台返回数据异常:', response);
                showMessage(response.message || '后台无数据', 'warning');
                // 清空所有带id的span标签内容
                $('span[id]').text('--').removeClass('text-danger text-success').addClass('text-primary');
                data = {};
                previousData = {};
            }
        },
        error: function(xhr, status, error) {
            console.error('从服务器获取JSON数据失败:', error);
            showMessage('服务器异常', 'warning');
            $('span[id]').text('--').removeClass('text-danger text-success').addClass('text-primary');
            data = {};
            previousData = {};
        }
    });
}

// 处理数据
function loadData() {
    try {
        // 根据数据来源选择不同的获取方式
        if (CONFIG.DATA_SOURCE === 'simulate_frontend') {
            // 使用前台模拟数据
            getDataFrontEnd();
        } else {
            // 使用后台数据（真实或模拟）
            getDataBackEnd();
        }
    } catch (error) {
        console.error('数据加载错误:', error);
        showMessage('服务异常', 'error');
        data = {};
    }
}

// 更新UI
function updateUI() {
    // 更新所有数据字段的值
    for (const key in data) {
        if (!key.includes('Trend')) {
            const $element = $(`#${key}`);
            if ($element.length) {
                $element.text(data[key]);
                // 根据趋势设置颜色
                if (data[`${key}Trend`] === 'up') {
                    $element.addClass('text-danger').removeClass('text-success text-primary');
                } else if (data[`${key}Trend`] === 'down') {
                    $element.addClass('text-success').removeClass('text-danger text-primary');
                } else {
                    $element.addClass('text-primary').removeClass('text-danger text-success');
                }
            }
        }
    }
}

// 消息提示
function showMessage(message, type) {
    const $toast = $('#systemToast');
    $toast.find('.toast-body')
        .text(message)
        .removeClass('text-danger text-warning text-success')
        .addClass(type === 'error' ? 'text-danger' : type === 'warning' ? 'text-warning' : 'text-success');
    
    const toast = new bootstrap.Toast($toast[0], {
        animation: true,
        autohide: true
        // delay: 1000
    });
    toast.show();
}

// 启动定时器
function startInterval() {
    if (interval > 0) timer = setInterval(loadData, interval);
}

// 清除定时器
function clearIntervalTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// 设置刷新间隔
function setIntervalTime(time) {
    clearIntervalTimer();
    interval = time;
    if (time > 0) {
        startInterval();
        showMessage('开始刷新', 'success');
    } else {
        showMessage('暂停刷新', 'warning');
    }
}

// 系统控制
function startSystem() {
    isSystemRunning = true;
    $('#toggleSystem').removeClass('btn-success').addClass('btn-danger').text('停止');
    $('input').prop('disabled', false);
    showMessage('系统已开机', 'success');
    startInterval();
}

// 停止系统
function stopSystem() {
    isSystemRunning = false;
    $('#toggleSystem').removeClass('btn-danger').addClass('btn-success').text('开机');
    $('input').prop('disabled', true);
    showMessage('系统已停机', 'error');
    clearIntervalTimer();
}

// 切换系统状态
function toggleSystem() {
    if (isSystemRunning) stopSystem();
    else startSystem();
}

// 更新数据源UI状态
function updateDataSourceUI() {
    // 更新单选按钮状态
    $('input[name="dataSource"]').each(function() {
        $(this).prop('checked', $(this).val() === CONFIG.DATA_SOURCE);
    });
}

// 切换数据源
function toggleDataSource(newSource) {
    const oldSource = CONFIG.DATA_SOURCE;
    CONFIG.DATA_SOURCE = newSource;
    
    // 显示切换提示
    switch(newSource) {
        case 'real_backend':
            showMessage('已切换至实时数据', 'success');
            break;
        case 'simulate_backend':
            showMessage('已切换至后台模拟数据', 'warning');
            break;
        case 'simulate_frontend':
            showMessage('已切换至前台模拟数据', 'warning');
            break;
    }
    
    // 立即加载新数据
    loadData();
}

// 发送热线仪命令
function sendAnemometer() {
    $.ajax({
        url: CONFIG.API_BASE_URL + CONFIG.API_URL_SEND_ANEMOMETER,
        type: 'GET',
        dataType: 'json',
        crossDomain: true,
        success: function(response) {
            if (response.code === 200) {
                showMessage(response.data, 'success');
            } else {
                showMessage('发送失败: ' + (response.message || '未知错误'), 'error');
            }
        },
        error: function(xhr, status, error) {
            showMessage('发送失败: ' + (error || '未知错误'), 'error');
        }
    });
}

// 页面加载完成后初始化
$(function() {
    // 切换系统状态按钮
    $('#toggleSystem').on('click', toggleSystem);
    
    // 刷新时间单选按钮事件
    $('input[name="btnradio"]').on('click', function() {
        if (!isSystemRunning) return;
        setIntervalTime(parseInt($(this).data('interval')));
    });
    
    // 数据源切换事件
    $('input[name="dataSource"]').on('change', function() {
        if (!isSystemRunning) return;
        toggleDataSource($(this).val());
    });

    // 发送热线仪按钮事件
    $('#sendAnemometerCommand').on('click', sendAnemometer);
    
    // 初始化UI
    updateUI();
    
    // 初始化数据源UI状态
    updateDataSourceUI();
}); 

