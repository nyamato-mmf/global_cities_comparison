// 分野別の初期グラフ
const labels_f = [
    "経済・ビジネス",
    "研究・開発",
    "文化・交流",
    "生活・居住",
    "環境",
    "交通・アクセス",
];

const scores_f = [50, 50, 50, 50, 50, 50];

const ch_f = new Chart("function", {
    type: "radar",
    data: {
        labels: labels_f,
        datasets: [
            {
                label: labels_f,
                data: scores_f,
                backgroundColor: "rgba(255, 89, 166, .7)"
            }
        ]
    },
    options: {
        title: {
            text: "分野別レーダーチャート（偏差値）",
            display: true,
            fontSize: 20,
        },
        scale: {
            pointLabels: {
                fontSize: 14
            },
            ticks: {
                max: 100,
                min: 0,
                stepSize: 20
            },
            gridLines: {
                lineWidth: 20,
            },
        },
        legend: {
            display: false
        },
        tooltips: {
            mode: "label",
            callbacks: {
                label: function (tooltipItem, data) {
                    return data['datasets'][0]['data'][tooltipItem['index']];
                }
            },
            titileFontSize: 16,
            titileFontColor: "pink",
            titleSpacing: 10,
            caretSize: 10,
            caretPadding: 10,
            borderColor: "black",
            borderWidth: 3,
        },
        responsive: true,
        maintainAspectRatio: false
    }
});


// jpc2023_fデータの読み込み
let jpc2023_f = [];
$.getJSON("./json/jpc2024_f.json", function (data) {
    jpc2023_f.push(data);
});

// 選択された都市のグラフを描画
document.getElementById("city").select.onchange = function () {
    let target = document.getElementById("city").select.value;

    let selected_f = jpc2023_f[0].filter(function (item, index) {
        if (item["city"] === target) {
            return true
        };
    });

    // 選択された都市の分野別スコアを代入
    ch_f.data.datasets[0].data[0] = parseFloat(selected_f[0]["Ec"]).toFixed(1)
    ch_f.data.datasets[0].data[1] = parseFloat(selected_f[0]["Re"]).toFixed(1)
    ch_f.data.datasets[0].data[2] = parseFloat(selected_f[0]["Cu"]).toFixed(1)
    ch_f.data.datasets[0].data[3] = parseFloat(selected_f[0]["Li"]).toFixed(1)
    ch_f.data.datasets[0].data[4] = parseFloat(selected_f[0]["En"]).toFixed(1)
    ch_f.data.datasets[0].data[5] = parseFloat(selected_f[0]["Ac"]).toFixed(1)


    // グラフを更新
    ch_f.update();
    ch_idg.update();

};
