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

4.  **檔案處理流程**:
    *   小於 100MB 的音檔會透過 Vercel Function 以 Base64 編碼方式直接傳送給 Gemini API 處理，速度較快。
    *   大於等於 100MB 的音檔會先串流上傳至 Gemini Files API，再由模型進行轉錄，以支援大型檔案並避免 Vercel Function 的記憶體限制。
