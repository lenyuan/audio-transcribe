# 課程部語音轉錄神器

An intelligent tool to transcribe M4A audio files into text, complete with speaker identification and timestamps, powered by Gemini.

## 部署須知 (Deployment Instructions)

部署到 Vercel 前請注意以下設定：

1.  **設定環境變數 (Environment Variables)**:
    *   在專案設定的 **Environment Variables** 區塊。
    *   新增一個名為 `API_KEY` 的變數。
    *   將您的 Google Gemini API 金鑰貼到值 (value) 的欄位中。

2.  **清除建置快取 (Clear Build Cache)**:
    *   當您重新部署時，特別是更新了後端依賴套件後，建議勾選 **Clear build cache** 選項以確保使用最新的設定。

3.  **檔案處理流程 (File Processing Flow)**:
    *   本專案使用 Vercel Blob 進行客戶端直接上傳，以繞過 Serverless Function 的請求大小限制，從而支援大型音檔的處理。

## 效能與限制 (Performance & Limitations)

*   **處理時間 (Processing Time)**: 轉錄的總時間受限於 Vercel Function 的 300 秒執行上限。這包含從 Vercel Blob 下載檔案和模型處理兩個主要階段。非常長的音檔（例如超過 90 分鐘）仍有可能超時。
*   **疑難排解 (Troubleshooting)**: 如果您遇到請求超時 (timeout) 的問題，請前往 Vercel 專案的 **Logs** 頁面查看 Function 的輸出。我們已加入計時日誌，您可以看到 `blobDownloadTime` (檔案下載耗時) 和 `geminiTranscriptionTime` (模型轉錄耗時)，這有助於判斷瓶頸所在。