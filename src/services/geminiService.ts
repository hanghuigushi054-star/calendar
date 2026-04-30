import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export interface ImageData {
  mimeType: string;
  data: string; // Base64 string without data: prefix
}

export async function analyzeSchedule(text: string, targetDateStr: string, graduationYear: string, image?: ImageData): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `あなたは、就職活動やインターンシップの選考管理をサポートするプロフェッショナルなスケジュール・アシスタントです。
ユーザーから提供された「企業の募集要項」や「案内メール」のテキスト、または「画像（スクリーンショット）」を解析し、目標日から逆算した具体的なアクションプランを作成してください。
ユーザーは${graduationYear}卒の就職活動を行っています。年号が明確でない場合は、この卒業予定年を考慮して、直近の妥当な年(YYYY)を推測して日付(YYYY-MM-DD)を設定してください。

## 処理のステップ
1. 入力されたテキスト・画像から「企業名」と「最終締切日時」を特定する。
2. ユーザーが設定した「前倒し目標日」を基準点とする。
3. 最終締切から逆算し、以下の項目について「いつまでに完了すべきか」の日程を算出する。
   - ES（エントリーシート）提出
   - Webテスト・筆記試験の受験
   - 面接の準備・想定問答作成
4. 算出した日程を出力する。

## 制約事項
- 日程感は、余裕を持って準備ができるように「最終締切の2週間前」を一つの目安として逆算してください。ただし、指定された「前倒し目標日」を必ず優先し、その日までに主要な提出や対応が完了するようスケジュールを組んでください。
- カレンダーに表示するため、scheduleの各dateは必ず「YYYY-MM-DD」形式で記述してください（例: "2024-05-08"）。
- 企業名や日程が不明確な場合は、その旨をnotesに記載し、推測できる範囲で作成してください。`;

  let promptText = `前倒し目標日: ${targetDateStr}\n\n対象テキスト:\n${text || "（テキストの入力はありませんでした。画像を解析してください）"}`;
  
  const parts: any[] = [{ text: promptText }];
  if (image) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          companyName: { type: Type.STRING, description: "企業名" },
          finalDeadline: { type: Type.STRING, description: "最終締切日時" },
          targetDate: { type: Type.STRING, description: "前倒し目標日" },
          schedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "締切日・期限 (必ず YYYY-MM-DD 形式、例: 2024-05-08)" },
                task: { type: Type.STRING, description: "タスク名 (例: ES初稿完成)" },
                description: { type: Type.STRING, description: "タスクの簡単な説明" }
              },
              required: ["date", "task", "description"]
            }
          },
          notes: { type: Type.STRING, description: "不明確な点がある場合の補足事項や警告" }
        },
        required: ["companyName", "finalDeadline", "targetDate", "schedule"]
      }
    }
  });

  if (!response.text) {
    throw new Error("APIからのレスポンスが空でした。");
  }

  return JSON.parse(response.text) as AnalysisResult;
}
