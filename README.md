# 收息簿（A 股股息追蹤，原型）
Node/Express 後端 + 單頁前端（public/）。尚未部署。

## 本機執行
    npm install
    npm start            # http://localhost:3000 （PORT 環境變數可改）

## API
- GET /api/search?q=紅利         代號／名稱搜尋（騰訊 smartbox）
- GET /api/info?q=601398[&kind=stock|etf|fund]   行情＋分紅＋股息率
- GET /api/batch?items=sh601398:stock,sh515080:etf,jj008163:fund
- GET /healthz

## 資料來源（免費公開，無金鑰）
- 行情：qt.gtimg.cn（騰訊）→ 失敗改 hq.sinajs.cn（新浪）；場外基金淨值 api.fund.eastmoney.com/f10/lsjz
- 個股分紅：emweb.securities.eastmoney.com F10 PageAjax（含派息日）→ 備援 datacenter-web RPT_SHAREBONUS_DET
- ETF／基金分紅：fundf10.eastmoney.com/fhsp_代號.html → 備援新浪基金 tabfh
- 快取：行情 60 秒、基金淨值 10 分、分紅 6 小時、搜尋 1 天（記憶體）
- 股價息率＝近 365 天（以除息日計）稅前每股現金分紅合計 ÷ 現價

## 部署（需老闆核准後）
Render 免費方案：Build `npm install`，Start `npm start`。
