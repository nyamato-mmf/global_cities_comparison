
const cityList = [
    '札幌市',
    '仙台市',
    '名古屋市',
    '京都市',
    '大阪市',
    '広島市',
    '福岡市',
    '千代田区',
    '中央区',
    '港区',
    '新宿区',
    '文京区',
    '台東区',
    '墨田区',
    '江東区',
    '品川区',
    '目黒区',
    '大田区',
    '世田谷区',
    '渋谷区',
    '中野区',
    '杉並区',
    '豊島区',
    '北区',
    '荒川区',
    '板橋区',
    '練馬区',
    '足立区',
    '葛飾区',
    '江戸川区',
];

for (let item of cityList) {
    const option = `<option value=${item}>${item}</option>`
    document.getElementById("list").insertAdjacentHTML("beforeend", option);
};
