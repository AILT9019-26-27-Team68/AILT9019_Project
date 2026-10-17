/**
 * i18n.js — Lightweight translation dictionary for the three supported locales:
 *   en       English
 *   zh-Hant  Traditional Chinese (Hong Kong)
 *   zh-Hans  Simplified Chinese
 *
 * No external dependency. Add keys here and use `t.<key>` in components.
 */

export const SUPPORTED_LOCALES = ["en", "zh-Hant", "zh-Hans"];

export const LOCALE_LABELS = {
  en: { short: "EN", full: "English" },
  "zh-Hant": { short: "繁中", full: "繁體中文（香港）" },
  "zh-Hans": { short: "简中", full: "简体中文" },
};

export const translations = {
  en: {
    title: "Student Risk Predictor",
    subtitle:
      "Informational academic coaching based on your structured lifestyle and study inputs.",

    disclaimerTitle: "Disclaimer:",
    disclaimerBody:
      "This tool provides informational academic coaching only. It does not replace academic advising or psychological counselling, does not diagnose, does not assess mental health, does not store your personal data, and does not make decisions about your academic standing.",
    disclaimerCrisis: "If you are in distress, contact",
    disclaimerCedars: "CEDARS",
    disclaimerEmergency:
      "or your campus support line. If you are in immediate danger, contact emergency services.",

    loadingForm: "Loading form…",
    submit: "Get Advice",
    submitLoading: "Analysing...",
    range: "range",

    loadingTitle: "Analysing your profile…",
    loadingSub: "This may take up to 30 seconds.",

    keyFactors: "Key factors",
    zBands: "Numeric z-score bands",
    advice: "Advice",
    crisisBanner:
      "High-stress pattern detected. Please reach out to CEDARS or your campus support service.",
    fallbackNote:
      "Live LLM advice was unavailable; showing safe fallback advice.",

    tierVeryLow: "Very Low risk",
    tierLow: "Low risk",
    tierModerate: "Moderate risk",
    tierHigh: "High risk",
    probability: "probability",

    fields: {
      Study_Hours_Per_Day: "Study Hours Per Day",
      Sleep_Hours_Per_Day: "Sleep Hours Per Day",
      Stress_Level: "Stress Level",
      Attendance_Rate: "Attendance Rate",
      Age: "Age",
      Extracurricular_Activities: "Extracurricular Activities",
      Exam_Proximity: "Exam Proximity",
      Part_Time_Job: "Part-Time Job",
    },
  },

  "zh-Hant": {
    title: "學生風險預測器",
    subtitle: "根據你的生活模式與學習輸入，提供學術指導資訊。",

    disclaimerTitle: "聲明：",
    disclaimerBody:
      "本工具只提供學術指導資訊，不能取代學術諮詢或心理輔導，不會進行診斷，不會評估精神健康，不會儲存你的個人資料，亦不會就你的學術狀況作出決定。",
    disclaimerCrisis: "如你感到困擾，請聯絡",
    disclaimerCedars: "CEDARS",
    disclaimerEmergency:
      "或你的校園支援熱線。如你身處即時危險，請聯絡緊急服務。",

    loadingForm: "載入表單中…",
    submit: "取得建議",
    submitLoading: "分析中...",
    range: "範圍",

    loadingTitle: "正在分析你的資料…",
    loadingSub: "可能需要最多 30 秒。",

    keyFactors: "主要因素",
    zBands: "數值 z 分數區間",
    advice: "建議",
    crisisBanner:
      "偵測到高壓力模式。請聯絡 CEDARS 或你的校園支援服務。",
    fallbackNote: "即時 LLM 建議未能提供；以下為安全備用建議。",

    tierVeryLow: "極低風險",
    tierLow: "低風險",
    tierModerate: "中風險",
    tierHigh: "高風險",
    probability: "概率",

    fields: {
      Study_Hours_Per_Day: "每日學習時數",
      Sleep_Hours_Per_Day: "每日睡眠時數",
      Stress_Level: "壓力水平",
      Attendance_Rate: "出席率",
      Age: "年齡",
      Extracurricular_Activities: "課外活動",
      Exam_Proximity: "考試臨近程度",
      Part_Time_Job: "兼職工作",
    },
  },

  "zh-Hans": {
    title: "学生风险预测器",
    subtitle: "基于您的结构化生活方式和学习输入，提供学术辅导信息。",

    disclaimerTitle: "声明：",
    disclaimerBody:
      "本工具仅提供学术辅导信息，不能代替学术咨询或心理咨询，不进行诊断，不评估心理健康，不存储您的个人数据，也不对您的学业状况做出决定。",
    disclaimerCrisis: "如果您感到困扰，请联系",
    disclaimerCedars: "CEDARS",
    disclaimerEmergency:
      "或您所在校园的支持热线。如果您处于紧急危险中，请联系紧急服务。",

    loadingForm: "正在加载表单…",
    submit: "获取建议",
    submitLoading: "分析中...",
    range: "范围",

    loadingTitle: "正在分析您的资料…",
    loadingSub: "这可能需要最多 30 秒。",

    keyFactors: "主要因素",
    zBands: "数值 z 分数区间",
    advice: "建议",
    crisisBanner:
      "检测到高压力模式。请联系 CEDARS 或您所在校园的支持服务。",
    fallbackNote: "实时 LLM 建议不可用；显示安全备用建议。",

    tierVeryLow: "极低风险",
    tierLow: "低风险",
    tierModerate: "中风险",
    tierHigh: "高风险",
    probability: "概率",

    fields: {
      Study_Hours_Per_Day: "每日学习时长",
      Sleep_Hours_Per_Day: "每日睡眠时长",
      Stress_Level: "压力水平",
      Attendance_Rate: "出勤率",
      Age: "年龄",
      Extracurricular_Activities: "课外活动",
      Exam_Proximity: "考试临近程度",
      Part_Time_Job: "兼职工作",
    },
  },
};

export function getTranslations(locale) {
  return translations[locale] || translations.en;
}
