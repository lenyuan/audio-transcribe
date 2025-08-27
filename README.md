# 課程部語音轉錄神器

An intelligent tool to transcribe M4A audio files into text, complete with speaker identification and timestamps, powered by Gemini.

## 部署須知 (Deployment Instructions)

部署到 Vercel 前請注意以下設定：

1.  **啟用 Fluid Compute**:
    *   前往 Vercel 專案儀表板 (Vercel Project Dashboard)。
    *   導覽至 **Settings** > **Functions**。
    *   啟用 **Fluid compute** 選項。這將允許 Serverless Functions 執行時間超過 Hobby 方案的預設限制（60秒），我們的設定是 300 秒。

2.  **設定環境變數 (Environment Variables)**:
    *   在專案設定的 **Environment Variables** 區塊。
    *   新增一個名為 `API_KEY` 的變數。
    *   將您的 Google Gemini API 金鑰貼到值 (value) 的欄位中。

3.  **清除建置快取 (Clear Build Cache)**:
    *   當您重新部署時，特別是更新了後端依賴套件後，建議勾選 **Clear build cache** 選項以確保使用最新的設定。

4.  **檔案處理流程 (File Processing Flow)**:
    *   **小於 100MB 的檔案 (Small Files)**: 為了追求最快的回應速度，檔案會直接在 Vercel Function 中以 Base64 編碼後傳送給 Gemini API。
    *   **大於等於 100MB 的檔案 (Large Files)**: 為了支援大型檔案並避免超過 Vercel 的記憶體限制，檔案會以串流方式上傳至 Gemini Files API。上傳完成後，再請求 Gemini 模型根據該檔案進行轉錄。

## 效能與限制 (Performance & Limitations)

*   **處理時間 (Processing Time)**: 雖然此專案已針對大型檔案進行優化，但轉錄的總時間仍受限於 Vercel Function 的 300 秒執行上限 (Hobby 方案 + Fluid Compute)。這包含檔案上傳至 Gemini 和模型處理兩個主要階段。非常長的音檔（例如超過 90 分鐘）仍有可能超時。
*   **疑難排解 (Troubleshooting)**: 如果您遇到請求超時 (timeout) 的問題，請前往 Vercel 專案的 **Logs** 頁面查看 Function 的輸出。我們已加入計時日誌，您可以看到 `geminiFileUploadTime` (檔案上傳耗時) 和 `geminiTranscriptionTime` (模型轉錄耗時)，這有助於判斷瓶頸所在。